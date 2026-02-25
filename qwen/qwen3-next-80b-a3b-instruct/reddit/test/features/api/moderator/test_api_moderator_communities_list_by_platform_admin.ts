import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_moderator_communities_list_by_platform_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin account
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const platformAdmin = await authorize_platform_admin_join(
    platformAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      },
    },
  );
  typia.assert(platformAdmin);
  // 2. Create community owner account
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwner = await authorize_community_owner_join(
    communityOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
      },
    },
  );
  typia.assert(communityOwner);
  // 3. Login as platform admin to get authorization token
  const platformAdminLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_platform_admin_login(platformAdminLoginConnection, {
    body: {
      email: platformAdmin.email,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 4. As platform admin, retrieve the list of communities where the community owner is moderator
  // This endpoint expects moderator assignments to exist on the server side
  // We test that the endpoint can be called and returns valid structure with platform admin privileges
  const moderatorList =
    await api.functional.redditCommunity.communityOwner.moderators.index(
      platformAdminLoginConnection,
      {
        userId: communityOwner.id,
      },
    );
  typia.assert(moderatorList);
  // 5. Validate the response structure
  TestValidator.equals(
    "pagination structure",
    typeof moderatorList.pagination,
    "object",
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(moderatorList.data),
    true,
  );
  // We cannot validate content because we cannot create moderator assignments
  // But we can verify the endpoint returns a valid structure
  if (moderatorList.data.length > 0) {
    const assignment = moderatorList.data[0];
    TestValidator.equals(
      "moderator user id exists",
      typeof assignment.user.id,
      "string",
    );
    TestValidator.equals(
      "moderator community id exists",
      typeof assignment.community.id,
      "string",
    );
    TestValidator.predicate("creation timestamp is valid", () => {
      const date = new Date(assignment.createdAt);
      return date instanceof Date && !isNaN(date.getTime());
    });
  }
}
