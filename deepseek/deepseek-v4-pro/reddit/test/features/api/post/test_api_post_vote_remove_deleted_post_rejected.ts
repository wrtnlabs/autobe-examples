import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import type { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
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
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Verify that attempting to remove a vote from a post that has been deleted is rejected.
 *
 * Validates that vote removal is not permitted on soft-deleted content. The test
 * establishes a post with an upvote from a second member, then deletes the post,
 * and confirms that the voter cannot remove their vote from the now-deleted post.
 *
 * The rejection confirms that the post validation check in the vote removal endpoint
 * properly detects the non-null deleted_at timestamp and prevents vote operations on
 * deleted content, maintaining the integrity of the voting system.
 *
 * 1. memberA registers via join and creates a community.
 * 2. memberB registers via join and subscribes to the community.
 * 3. memberA creates a text post in the community.
 * 4. memberB upvotes the post, establishing a vote record.
 * 5. memberA deletes the post, setting the deleted_at timestamp.
 * 6. memberB attempts to remove their vote from the deleted post — the request is rejected.
 */
export async function test_api_post_vote_remove_deleted_post_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register memberA (post author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2. memberA creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Register memberB (voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 4. memberB subscribes to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberBConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 5. memberA creates a post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberAConnection,
    {
      params: {
        communityName: community.name,
      },
    },
  );
  typia.assert(post);
  // 6. memberB upvotes the post
  const vote = await api.functional.communityHub.member.posts.upvote(
    memberBConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(vote);
  // 7. memberA deletes the post
  await api.functional.communityHub.posts.erase(memberAConnection, {
    postId: post.id,
  });
  // 8. memberB attempts to remove vote from deleted post — should be rejected
  await TestValidator.error(
    "vote removal on deleted post should be rejected",
    async () => {
      await api.functional.communityHub.member.posts.vote.erase(
        memberBConnection,
        {
          postId: post.id,
        },
      );
    },
  );
}
