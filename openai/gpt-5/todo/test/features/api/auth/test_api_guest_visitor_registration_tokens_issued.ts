import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuestVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestVisitor";

/**
 * Register a guest visitor and verify tokens and actor metadata.
 *
 * Business context:
 *
 * - Endpoint is public and creates an anonymous guest actor with JWT tokens.
 * - No credentials are accepted; request body is intentionally empty ({}).
 *
 * Validations performed:
 *
 * 1. Call join with an empty body and assert response schema.
 * 2. Ensure token.access and token.refresh are non-empty strings.
 * 3. Verify timestamps are valid ISO strings and updated_at >= created_at.
 * 4. Verify token.refreshable_until >= token.expired_at.
 * 5. If guestVisitor is present, ensure its id matches the top-level id and
 *    schema.
 * 6. Call join again to ensure a new, distinct actor id is issued (fresh
 *    registration).
 */
export async function test_api_guest_visitor_registration_tokens_issued(
  connection: api.IConnection,
) {
  // 1) Register a guest visitor with minimal allowed payload (empty object)
  const first = await api.functional.auth.guestVisitor.join(connection, {
    body: {} satisfies ITodoListGuestVisitor.ICreate,
  });
  typia.assert(first);

  // 2) Non-empty tokens
  TestValidator.predicate(
    "access token should be non-empty",
    first.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    first.token.refresh.length > 0,
  );

  // 3) Timestamp validity and ordering
  const createdAtMs1: number = new Date(first.created_at).getTime();
  const updatedAtMs1: number = new Date(first.updated_at).getTime();
  TestValidator.predicate(
    "created_at and updated_at parseable",
    Number.isFinite(createdAtMs1) && Number.isFinite(updatedAtMs1),
  );
  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    updatedAtMs1 >= createdAtMs1,
  );

  // 4) Token time window sanity
  const accessExpMs1: number = new Date(first.token.expired_at).getTime();
  const refreshUntilMs1: number = new Date(
    first.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "token expiration timestamps parseable",
    Number.isFinite(accessExpMs1) && Number.isFinite(refreshUntilMs1),
  );
  TestValidator.predicate(
    "refreshable_until should be greater than or equal to expired_at",
    refreshUntilMs1 >= accessExpMs1,
  );

  // 5) guestVisitor payload coherence when present
  if (first.guestVisitor !== undefined) {
    typia.assert(first.guestVisitor);
    TestValidator.equals(
      "guestVisitor.id must match top-level id",
      first.guestVisitor.id,
      first.id,
    );
  }

  // 6) Subsequent registration issues a fresh actor (different id)
  const second = await api.functional.auth.guestVisitor.join(connection, {
    body: {} satisfies ITodoListGuestVisitor.ICreate,
  });
  typia.assert(second);
  TestValidator.notEquals(
    "second join should create a different actor id",
    second.id,
    first.id,
  );
}
