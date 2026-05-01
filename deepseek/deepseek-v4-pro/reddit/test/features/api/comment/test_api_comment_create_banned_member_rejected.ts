import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityBan";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_bans_create } from "../../../generate/generate_random_community_hub_member_communities_bans_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_community_ban } from "../../../prepare/prepare_random_community_hub_community_ban";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

export async function test_api_comment_create_banned_member_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins the platform
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to the community
  const subscriptionA =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberAConnection,
      { communityName: community.name },
    );
  typia.assert(subscriptionA);
  // 4. Member A creates a post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberAConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  const initialCommentCount = post.comment_count;
  // 5. Member B joins the platform
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 6. Member B subscribes to the community
  const subscriptionB =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberBConnection,
      { communityName: community.name },
    );
  typia.assert(subscriptionB);
  // 7. Member A (community owner) bans Member B from the community
  const ban =
    await generate_random_community_hub_member_communities_bans_create(
      memberAConnection,
      {
        params: { communityName: community.name },
        body: { username: memberB.username },
      },
    );
  typia.assert(ban);
  // 8. Member B attempts to create a comment on the post — rejected with 403
  await TestValidator.httpError(
    "banned member cannot create comment",
    403,
    async () => {
      await api.functional.communityHub.posts.comments.create(
        memberBConnection,
        {
          postId: post.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityHubComment.ICreate,
        },
      );
    },
  );
}
