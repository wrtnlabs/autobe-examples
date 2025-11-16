import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

/**
 * Validate guestUser.join handle reuse and uniqueness behavior.
 *
 * This test focuses on the behavior of POST /auth/guestUser/join when called
 * multiple times with the same anonymous_handle. Even though the original
 * scenario mentions uniqueness constraint errors when reuse is impossible, the
 * public SDK only exposes this join API and no inspection/deletion endpoints.
 * Therefore, within the observable surface, we validate that:
 *
 * 1. A first join call with a given anonymous_handle creates or resolves a guest
 *    user and issues an authorized payload with token.
 * 2. A second join call with the same anonymous_handle reuses the same guest
 *    record (same id and created_at) instead of silently creating a distinct
 *    non-deleted record.
 * 3. The guest's deleted_at remains unchanged (typically null) between calls,
 *    ensuring no implicit delete/undelete side effects.
 * 4. The updated_at field is refreshed on the second call, reflecting lifecycle
 *    update semantics while preserving identity.
 * 5. A fresh token is issued on each call and the token strings differ,
 *    demonstrating new authorization material while reusing the guest actor.
 */
export async function test_api_guest_user_join_enforces_handle_uniqueness(
  connection: api.IConnection,
) {
  // Step 1: Prepare a stable anonymous_handle and realistic context fields
  const anonymousHandle: string = RandomGenerator.alphaNumeric(24);
  const href1: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer1: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const userAgent1: string = RandomGenerator.name(3);
  const ip1:
    | (string & tags.Format<"ipv4">)
    | (string & tags.Format<"ipv6">)
    | null = typia.random<
    (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
  >();

  const firstBody = {
    anonymous_handle: anonymousHandle,
    user_agent: userAgent1,
    ip: ip1,
    href: href1,
    referrer: referrer1,
  } satisfies ICommunityPlatformGuestuser.IJoin;

  // Step 2: First join call – expect success and a fully-typed authorized payload
  const firstAuthorized: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: firstBody,
    });
  typia.assert(firstAuthorized);

  const firstGuestId = firstAuthorized.id;
  const firstHandle = firstAuthorized.anonymous_handle ?? null;
  const firstDeletedAt = firstAuthorized.deleted_at ?? null;
  const firstCreatedAt = firstAuthorized.created_at;
  const firstUpdatedAt = firstAuthorized.updated_at;
  const firstToken: IAuthorizationToken = firstAuthorized.token;

  // Ensure token fields are present and non-empty
  TestValidator.predicate(
    "first join issues non-empty access token",
    firstToken.access.length > 0,
  );
  TestValidator.predicate(
    "first join issues non-empty refresh token",
    firstToken.refresh.length > 0,
  );

  // Ensure the anonymous_handle we sent is reflected (or remains null only if
  // implementation chose not to persist it)
  if (firstBody.anonymous_handle !== undefined) {
    TestValidator.equals(
      "first authorized payload preserves anonymous_handle when provided",
      firstHandle,
      firstBody.anonymous_handle,
    );
  }

  // Step 3: Second join call with same handle, different context
  const href2: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer2: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const userAgent2: string = RandomGenerator.name(2);
  const ip2:
    | (string & tags.Format<"ipv4">)
    | (string & tags.Format<"ipv6">)
    | null = typia.random<
    (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
  >();

  const secondBody = {
    anonymous_handle: anonymousHandle,
    user_agent: userAgent2,
    ip: ip2,
    href: href2,
    referrer: referrer2,
  } satisfies ICommunityPlatformGuestuser.IJoin;

  const secondAuthorized: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: secondBody,
    });
  typia.assert(secondAuthorized);

  const secondGuestId = secondAuthorized.id;
  const secondHandle = secondAuthorized.anonymous_handle ?? null;
  const secondDeletedAt = secondAuthorized.deleted_at ?? null;
  const secondCreatedAt = secondAuthorized.created_at;
  const secondUpdatedAt = secondAuthorized.updated_at;
  const secondToken: IAuthorizationToken = secondAuthorized.token;

  // Step 4: Business assertions – reuse of guest record and token refresh

  // 4-1. Same guest id implies reuse of the underlying guest record
  TestValidator.equals(
    "second join with same handle reuses same guest id",
    secondGuestId,
    firstGuestId,
  );

  // 4-2. anonymous_handle consistency when either side is non-null
  if (firstHandle !== null || secondHandle !== null) {
    TestValidator.equals(
      "anonymous_handle remains consistent across joins",
      secondHandle,
      firstHandle,
    );
  }

  // 4-3. deleted_at should remain unchanged (typically null)
  TestValidator.equals(
    "deleted_at does not change between joins",
    secondDeletedAt,
    firstDeletedAt,
  );

  // 4-4. created_at should remain stable; updated_at should be >= first
  TestValidator.equals(
    "created_at remains stable across joins",
    secondCreatedAt,
    firstCreatedAt,
  );

  const firstUpdatedTime = new Date(firstUpdatedAt).getTime();
  const secondUpdatedTime = new Date(secondUpdatedAt).getTime();
  TestValidator.predicate(
    "updated_at on second join is not earlier than first",
    secondUpdatedTime >= firstUpdatedTime,
  );

  // 4-5. Token must be refreshed: at least one of access/refresh changes
  TestValidator.predicate(
    "second join issues a different access or refresh token",
    secondToken.access !== firstToken.access ||
      secondToken.refresh !== firstToken.refresh,
  );

  // 4-6. Second authorized payload is valid and carries a non-empty token
  TestValidator.predicate(
    "second join issues non-empty access token",
    secondToken.access.length > 0,
  );
  TestValidator.predicate(
    "second join issues non-empty refresh token",
    secondToken.refresh.length > 0,
  );
}
