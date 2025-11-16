import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_session_deletion_with_prerequisite_account_status(
  connection: api.IConnection,
) {
  // 1. Create a prerequisite account status definition, such as an ACTIVE status.
  const accountStatusBody = {
    key: "ACTIVE",
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusBody },
    );
  typia.assert(createdStatus);

  // 2. Register a new platform administrator (join) and obtain an authorized payload.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const authorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Basic sanity checks on the join response and embedded token/status.
  TestValidator.predicate(
    "platform admin id is non-empty",
    () => authorized.id.length > 0,
  );
  typia.assert<IAuthorizationToken>(authorized.token);
  typia.assert<ICommunityPlatformAccountStatus.ISummary>(
    authorized.accountStatus,
  );

  // 3. Generate a syntactically valid UUID for the session id.
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Call the session deletion endpoint using the created admin id and random session id.
  const eraseResult =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.erase(
      connection,
      {
        platformAdminId: authorized.id,
        sessionId,
      },
    );

  // The endpoint returns void; assert that the result is undefined at runtime.
  TestValidator.equals(
    "session erase returns void (undefined)",
    eraseResult,
    undefined,
  );
}
