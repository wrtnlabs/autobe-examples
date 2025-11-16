import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_moderator_delete_does_not_require_related_community(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (this also authenticates as that admin)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. (Optional) Re-login as the same platform admin to mirror real flows
  const platformAdminLoginBody = {
    identifier: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: platformAdminJoinBody.ip ?? undefined,
    href: platformAdminJoinBody.href,
    referrer: platformAdminJoinBody.referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 3. While authenticated as platformAdmin, register a community moderator
  const communityModeratorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://community.example.com/moderator/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 4. As platformAdmin, ensure the moderator exists via GET
  const moderatorBeforeDelete: ICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.platformAdmin.communityModerators.at(
      connection,
      {
        communityModeratorId: moderatorAuthorized.id,
      },
    );
  typia.assert(moderatorBeforeDelete);

  TestValidator.equals(
    "moderator id from summary should match id from join",
    moderatorBeforeDelete.id,
    moderatorAuthorized.id,
  );

  TestValidator.equals(
    "moderator email from summary should match join email",
    moderatorBeforeDelete.email,
    communityModeratorJoinBody.email,
  );

  // 5. Delete the moderator via platformAdmin erase endpoint
  await api.functional.communityPlatform.platformAdmin.communityModerators.erase(
    connection,
    {
      communityModeratorId: moderatorAuthorized.id,
    },
  );

  // 6. Confirm that subsequent GET fails, indicating successful deletion
  await TestValidator.error(
    "deleted community moderator should not be retrievable by platformAdmin",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityModerators.at(
        connection,
        {
          communityModeratorId: moderatorAuthorized.id,
        },
      );
    },
  );
}
