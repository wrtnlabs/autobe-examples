import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
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
import { generate_random_community_hub_comments_reply } from "../../../generate/generate_random_community_hub_comments_reply";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Verify that a different member can reply to a comment authored by another member.
 *
 * Validates the business rule that any authenticated member can reply to any visible
 * comment regardless of authorship, subscription status, or community membership.
 * The first member creates all prerequisite content — a community, subscription,
 * post, and top-level comment. A second, separately authenticated member then
 * replies to the first member's comment without subscribing to the community or
 * having any prior relationship with the content.
 *
 * 1. First member registers and authenticates via join.
 * 2. First member creates a community and subscribes to it.
 * 3. First member creates a text post within the community.
 * 4. First member writes a top-level comment on the post (depth 0).
 * 5. Second member registers and authenticates independently.
 * 6. Second member replies to the first member's comment.
 * 7. Validates the reply author is the second member with depth 1, vote_score 0,
 *    the parent references the original comment, and the post matches.
 */
export async function test_api_comment_reply_cross_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member joins and authenticates
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {});
  typia.assert(firstMember);
  // 2. First member creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      firstMemberConnection,
      {},
    );
  typia.assert(community);
  // 3. First member subscribes to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      firstMemberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. First member creates a text post
  const post = await generate_random_community_hub_communities_posts_create(
    firstMemberConnection,
    {
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. First member writes a top-level comment
  const parentComment =
    await generate_random_community_hub_posts_comments_create(
      firstMemberConnection,
      { params: { postId: post.id } },
    );
  typia.assert(parentComment);
  // 6. Second member joins and authenticates separately
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {});
  typia.assert(secondMember);
  // 7. Second member replies to the first member's comment
  const reply = await generate_random_community_hub_comments_reply(
    secondMemberConnection,
    { params: { commentId: parentComment.id } },
  );
  typia.assert(reply);
  // 8. Validate the reply
  TestValidator.equals(
    "reply author id matches second member",
    reply.author.id,
    secondMember.id,
  );
  TestValidator.equals(
    "reply author username matches second member",
    reply.author.username,
    secondMember.username,
  );
  TestValidator.equals("reply depth is 1", reply.depth, 1);
  TestValidator.equals("reply vote score is 0", reply.vote_score, 0);
  TestValidator.predicate("reply parent comment exists", reply.parent !== null);
  TestValidator.equals(
    "reply belongs to the same post as parent",
    reply.post.id,
    post.id,
  );
}
