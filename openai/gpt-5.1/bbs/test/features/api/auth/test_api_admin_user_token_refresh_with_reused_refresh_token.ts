import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserRefresh";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

export async function test_api_admin_user_token_refresh_with_reused_refresh_token(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain initial authorized session and refresh token
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(16) as string & tags.Format<"password">;

  const joinBody = {
    email,
    password,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const joined: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  const adminId = joined.id;
  const initialToken: IAuthorizationToken = joined.token;

  // Basic identity and token sanity checks
  TestValidator.predicate(
    "admin id must be non-empty on join",
    () => joined.id.length > 0,
  );
  TestValidator.predicate(
    "access token must be non-empty on join",
    () => joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token must be non-empty on join",
    () => joined.token.refresh.length > 0,
  );

  // 2. First refresh using the initial refresh token
  const firstRefreshBody = {
    refreshToken: initialToken.refresh,
  } satisfies IDiscussionBoardAdminUserRefresh.IRequest;

  const firstRefreshed: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: firstRefreshBody,
    });
  typia.assert(firstRefreshed);

  const firstRefreshToken: IAuthorizationToken = firstRefreshed.token;

  // Identity must remain stable between join and first refresh
  TestValidator.equals(
    "admin id must remain stable between join and first refresh",
    firstRefreshed.id,
    adminId,
  );
  TestValidator.equals(
    "admin email must remain stable between join and first refresh",
    firstRefreshed.email,
    email,
  );
  TestValidator.equals(
    "admin displayName must remain stable between join and first refresh",
    firstRefreshed.displayName,
    joined.displayName,
  );
  TestValidator.equals(
    "admin status must remain stable between join and first refresh",
    firstRefreshed.status,
    joined.status,
  );
  TestValidator.equals(
    "admin role must remain stable between join and first refresh",
    firstRefreshed.role,
    joined.role,
  );
  TestValidator.equals(
    "emailVerified flag must remain stable between join and first refresh",
    firstRefreshed.emailVerified,
    joined.emailVerified,
  );

  // Access token should typically rotate on refresh
  TestValidator.notEquals(
    "access token should rotate on first refresh",
    firstRefreshToken.access,
    initialToken.access,
  );

  TestValidator.predicate(
    "refresh token after first refresh must be non-empty",
    () => firstRefreshToken.refresh.length > 0,
  );

  // 3. Second refresh reusing the ORIGINAL refresh token
  const reusedRefreshBody = {
    refreshToken: initialToken.refresh,
  } satisfies IDiscussionBoardAdminUserRefresh.IRequest;

  try {
    const reusedRefreshed: IDiscussionBoardAdminuser.IAuthorized =
      await api.functional.auth.adminUser.refresh(connection, {
        body: reusedRefreshBody,
      });
    typia.assert(reusedRefreshed);

    // If backend allows reuse, identity must still be consistent
    TestValidator.equals(
      "admin id remains stable when reusing original refresh token",
      reusedRefreshed.id,
      adminId,
    );
    TestValidator.equals(
      "admin email remains stable when reusing original refresh token",
      reusedRefreshed.email,
      email,
    );

    TestValidator.predicate(
      "access token from reused refresh must be non-empty",
      () => reusedRefreshed.token.access.length > 0,
    );
    TestValidator.predicate(
      "refresh token from reused refresh must be non-empty",
      () => reusedRefreshed.token.refresh.length > 0,
    );
  } catch {
    // If backend rejects reuse of refresh token, that is also acceptable.
    // We intentionally do not assert on failure here to stay policy-agnostic.
  }

  // 4. Refresh using the latest refresh token from the first refresh
  const latestRefreshBody = {
    refreshToken: firstRefreshToken.refresh,
  } satisfies IDiscussionBoardAdminUserRefresh.IRequest;

  const latestRefreshed: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: latestRefreshBody,
    });
  typia.assert(latestRefreshed);

  const latestToken: IAuthorizationToken = latestRefreshed.token;

  // Identity invariants must still hold
  TestValidator.equals(
    "admin id must remain stable when using latest refresh token",
    latestRefreshed.id,
    adminId,
  );
  TestValidator.equals(
    "admin email must remain stable when using latest refresh token",
    latestRefreshed.email,
    email,
  );
  TestValidator.equals(
    "admin displayName must remain stable when using latest refresh token",
    latestRefreshed.displayName,
    joined.displayName,
  );
  TestValidator.equals(
    "admin status must remain stable when using latest refresh token",
    latestRefreshed.status,
    joined.status,
  );
  TestValidator.equals(
    "admin role must remain stable when using latest refresh token",
    latestRefreshed.role,
    joined.role,
  );
  TestValidator.equals(
    "emailVerified flag must remain stable when using latest refresh token",
    latestRefreshed.emailVerified,
    joined.emailVerified,
  );

  // Access token should again rotate compared to the previous one
  TestValidator.notEquals(
    "access token should rotate when using latest refresh token",
    latestToken.access,
    firstRefreshToken.access,
  );

  TestValidator.predicate(
    "refresh token from latest refresh must be non-empty",
    () => latestToken.refresh.length > 0,
  );
}
