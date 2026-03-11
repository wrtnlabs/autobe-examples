import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_ban } from "../../../generate/generate_random_reddit_platform_member_communities_bans_ban";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";

export async function test_api_community_ban_user_already_banned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    ownerConnection,
    {
      body: {},
    },
  );
  typia.assert(owner);
  // 2. Create a community
  const community: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
        },
      },
    );
  typia.assert(community);
  // 3. Authenticate as target user
  const targetConnection: api.IConnection = { host: connection.host };
  const target: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    targetConnection,
    {
      body: {},
    },
  );
  typia.assert(target);
  // 4. First ban attempt - should succeed
  const firstBan: IRedditPlatformCommunityBan =
    await generate_random_reddit_platform_member_communities_bans_ban(
      ownerConnection,
      {
        body: {},
        params: {
          communityId: community.id,
          userId: target.id,
        },
      },
    );
  typia.assert(firstBan);
  // 5. Second ban attempt - should fail with business logic error (user already banned)
  // Use SDK function directly to test the actual business logic validation
  await TestValidator.error("user already banned", async () => {
    await api.functional.redditPlatform.member.communities.bans.ban(
      ownerConnection,
      {
        communityId: community.id,
        userId: target.id,
        body: {
          userId: target.id,
        },
      },
    );
  });
}
