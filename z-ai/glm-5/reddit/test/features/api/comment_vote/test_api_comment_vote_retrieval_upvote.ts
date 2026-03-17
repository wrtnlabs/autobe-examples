import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_vote_create } from "../../../generate/generate_random_community_platform_member_posts_comments_vote_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_vote_retrieval_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Create a text post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          postType: "text",
          content: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  // 4. Create a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  // 5. Cast an upvote on the comment
  const vote =
    await generate_random_community_platform_member_posts_comments_vote_create(
      memberConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: { vote_type: "upvote" },
      },
    );
  typia.assert(vote);
  // 6. Retrieve the vote by ID
  const retrievedVote =
    await api.functional.communityPlatform.posts.comments.votes.at(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        voteId: vote.id,
      },
    );
  typia.assert(retrievedVote);
  // 7. Validate vote properties
  TestValidator.equals("vote ID matches", retrievedVote.id, vote.id);
  TestValidator.equals("vote type is upvote", retrievedVote.voteType, "upvote");
  TestValidator.equals("deletedAt is null", retrievedVote.deletedAt, null);
  TestValidator.equals("member ID matches", retrievedVote.member.id, member.id);
  TestValidator.predicate(
    "createdAt is valid ISO 8601",
    !isNaN(new Date(retrievedVote.createdAt).getTime()),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO 8601",
    !isNaN(new Date(retrievedVote.updatedAt).getTime()),
  );
}
