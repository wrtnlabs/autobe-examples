import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_owner_retrieval_not_found_for_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin connection and register platform admin
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const platformAdmin: IRedditCommunityPlatformAdmin.IAuthorized =
    await authorize_platform_admin_join(platformAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      },
    });
  // 2. Create community owner account with captured password
  const randomPassword = RandomGenerator.alphaNumeric(16);
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwner: IRedditCommunityCommunityOwner.IAuthorized =
    await authorize_community_owner_join(communityOwnerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: randomPassword,
        displayName: RandomGenerator.name(),
      },
    });
  const communityOwnerId = communityOwner.id;
  // 3. Create a community owned by the community owner using platform admin
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.create(
      platformAdminConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Login as community owner and delete the community
  const communityOwnerDeleteConn: api.IConnection = { host: connection.host };
  await authorize_community_owner_login(communityOwnerDeleteConn, {
    body: {
      email: communityOwner.email,
      password: randomPassword,
    },
  });
  await api.functional.redditCommunity.communityOwner.communities.erase(
    communityOwnerDeleteConn,
    { communityId: community.id },
  );
  // 5. Attempt to retrieve the community owner's details - should return 404
  const retrievalConnection: api.IConnection = { host: connection.host };
  try {
    await api.functional.redditCommunity.platformAdmin.community_owners.at(
      retrievalConnection,
      { communityOwnerId },
    );
    TestValidator.error("retrieval should fail with 404", () => {
      throw new Error("Expected 404 Not Found");
    });
  } catch (error) {
    typia.assertGuard(error);
    TestValidator.equals("status is 404 Not Found", (error as any).status, 404);
  }
}