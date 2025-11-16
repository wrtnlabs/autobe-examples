import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_token_refresh_preserves_session_audit_fields(
  connection: api.IConnection,
) {
  // 1. Prepare deterministic session context metadata for join and refresh
  const joinHref: string & tags.Format<"uri"> =
    "https://admin.example.com/register" as string & tags.Format<"uri">;
  const joinReferrer: string & tags.Format<"uri"> =
    "https://admin.example.com/landing" as string & tags.Format<"uri">;
  const joinIp = "198.51.100.10";

  const refreshHref: string & tags.Format<"uri"> =
    "https://admin.example.com/dashboard" as string & tags.Format<"uri">;
  const refreshReferrer: string & tags.Format<"uri"> =
    "https://admin.example.com/login" as string & tags.Format<"uri">;
  const refreshIp = "203.0.113.42";

  // 2. Register a new platform admin to obtain initial tokens
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username = `e2e_admin_${RandomGenerator.alphaNumeric(8)}`;
  const password = "StrongP@ssw0rd!";
  const displayName = RandomGenerator.name();

  const joinBody = {
    username,
    email,
    password,
    displayName,
    ip: joinIp,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const joined: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(joined);

  // 3. Extract original tokens and account metadata
  const originalToken: IAuthorizationToken = joined.token;
  const originalAdminId = joined.id;
  const originalUsername = joined.username;
  const originalEmail = joined.email;
  const originalDisplayName = joined.displayName;
  const originalAccountStatus: ICommunityPlatformAccountStatus.ISummary =
    joined.accountStatus;
  const originalDeletedAt = joined.deletedAt ?? null;

  // Business sanity checks on initial join result
  TestValidator.predicate(
    "initial accountStatus.isLoginAllowed should be true",
    originalAccountStatus.isLoginAllowed === true,
  );
  TestValidator.equals(
    "initial deletedAt should be null",
    originalDeletedAt,
    null,
  );

  // 4. Build refresh request body using refreshToken and new session metadata
  const refreshBody = {
    refreshToken: originalToken.refresh,
    ip: refreshIp,
    href: refreshHref,
    referrer: refreshReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IRefresh;

  const refreshed: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.refresh(connection, {
      body: refreshBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(refreshed);

  // 5. Validate that the refreshed admin profile is consistent
  TestValidator.equals(
    "refreshed admin id should equal original admin id",
    refreshed.id,
    originalAdminId,
  );
  TestValidator.equals(
    "refreshed username should equal original username",
    refreshed.username,
    originalUsername,
  );
  TestValidator.equals(
    "refreshed email should equal original email",
    refreshed.email,
    originalEmail,
  );
  TestValidator.equals(
    "refreshed displayName should equal original displayName",
    refreshed.displayName,
    originalDisplayName,
  );

  // 6. Validate account status semantics after refresh
  const refreshedAccountStatus: ICommunityPlatformAccountStatus.ISummary =
    refreshed.accountStatus;
  TestValidator.equals(
    "refreshed accountStatus.id should equal original accountStatus.id",
    refreshedAccountStatus.id,
    originalAccountStatus.id,
  );
  TestValidator.predicate(
    "refreshed accountStatus.isLoginAllowed should still be true",
    refreshedAccountStatus.isLoginAllowed === true,
  );

  const refreshedDeletedAt = refreshed.deletedAt ?? null;
  TestValidator.equals(
    "refreshed deletedAt should remain null (account not soft-deleted)",
    refreshedDeletedAt,
    null,
  );

  // 7. Validate token rotation behavior
  const refreshedToken: IAuthorizationToken = refreshed.token;
  TestValidator.notEquals(
    "refresh token should be rotated (different from original)",
    refreshedToken.refresh,
    originalToken.refresh,
  );
  TestValidator.notEquals(
    "access token should be rotated (different from original)",
    refreshedToken.access,
    originalToken.access,
  );

  // Additional sanity: expired_at and refreshable_until were already validated by typia.assert
}
