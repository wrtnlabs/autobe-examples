import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuestVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestVisitor";

/**
 * Verify repeated guest joins issue distinct actors and valid tokens.
 *
 * Context:
 *
 * - The Minimal Todo List service allows anonymous guest actors to "join" and
 *   receive JWT tokens without credentials. Each join must create a fresh guest
 *   actor record and must not reuse logically removed or previous actors.
 *
 * Steps:
 *
 * 1. Call POST /auth/guestVisitor/join to create the first guest actor and get
 *    tokens.
 * 2. Call the same endpoint again to create a second guest actor and get tokens.
 * 3. Validate:
 *
 *    - Both responses conform to ITodoListGuestVisitor.IAuthorized (typia.assert).
 *    - Actor ids differ between the two joins (distinct actors per call).
 *    - Created_at <= updated_at for each response.
 *    - Access/refresh tokens are non-empty strings.
 *    - If embedded guestVisitor exists, its id equals the top-level id.
 */
export async function test_api_guest_visitor_multiple_joins_create_distinct_actors(
  connection: api.IConnection,
) {
  // 1) First guest join
  const first = await api.functional.auth.guestVisitor.join(connection, {
    body: {} satisfies ITodoListGuestVisitor.ICreate,
  });
  typia.assert(first);

  // 2) Second guest join
  const second = await api.functional.auth.guestVisitor.join(connection, {
    body: {} satisfies ITodoListGuestVisitor.ICreate,
  });
  typia.assert(second);

  // 3) Distinct actor ids
  TestValidator.notEquals(
    "second guest id should differ from first",
    first.id,
    second.id,
  );

  // 4) Timestamps: created_at <= updated_at for each payload
  const firstCreated = Date.parse(first.created_at);
  const firstUpdated = Date.parse(first.updated_at);
  const secondCreated = Date.parse(second.created_at);
  const secondUpdated = Date.parse(second.updated_at);

  TestValidator.predicate(
    "first payload timestamps are ordered (created_at <= updated_at)",
    firstCreated <= firstUpdated,
  );
  TestValidator.predicate(
    "second payload timestamps are ordered (created_at <= updated_at)",
    secondCreated <= secondUpdated,
  );

  // 5) Token presence sanity checks (non-empty strings)
  TestValidator.predicate(
    "first token.access is non-empty",
    first.token.access.length > 0,
  );
  TestValidator.predicate(
    "first token.refresh is non-empty",
    first.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "second token.access is non-empty",
    second.token.access.length > 0,
  );
  TestValidator.predicate(
    "second token.refresh is non-empty",
    second.token.refresh.length > 0,
  );

  // 6) Optional embedded identity coherence
  if (first.guestVisitor !== undefined) {
    typia.assert(first.guestVisitor);
    TestValidator.equals(
      "first embedded guestVisitor.id matches top-level id",
      first.guestVisitor.id,
      first.id,
    );
  }
  if (second.guestVisitor !== undefined) {
    typia.assert(second.guestVisitor);
    TestValidator.equals(
      "second embedded guestVisitor.id matches top-level id",
      second.guestVisitor.id,
      second.id,
    );
  }
}
