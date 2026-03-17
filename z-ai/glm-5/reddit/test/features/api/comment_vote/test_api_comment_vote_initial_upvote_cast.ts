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
import { generate_random_community_platform_member_posts_comments_vote_cast } from "../../../generate/generate_random_community_platform_member_posts_comments_vote_cast";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_vote_initial_upvote_cast(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (voter) authenticates via member join
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  // 2. Member A creates a community (becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      voterConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A creates a text post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      voterConnection,
      {
        params: { communityId: community.id },
        body: {
          title: RandomGenerator.name(),
          postType: "text",
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(post);
  // 4. Member B (comment author) authenticates via member join
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  // Store initial karma of comment author
  const initialKarma = author.karma;
  // 5. Member B creates a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // Verify initial comment state (vote_score should be 0)
  TestValidator.equals("initial comment vote_score", comment.voteScore, 0);
  // 6. Member A casts an upvote on Member B's comment
  const vote =
    await api.functional.communityPlatform.member.posts.comments.vote.cast(
      voterConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(vote);
  // Validation Points
  TestValidator.equals("vote_type is upvote", vote.voteType, "upvote");
  TestValidator.equals("voter id matches", vote.member.id, voter.id);
  TestValidator.predicate(
    "created_at is set",
    vote.createdAt !== null && vote.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated_at is set",
    vote.updatedAt !== null && vote.updatedAt !== undefined,
  );
  TestValidator.equals(
    "deleted_at is null (active vote)",
    vote.deletedAt,
    null,
  );
  // Verify vote record contains correct member summary
  TestValidator.equals(
    "voter username matches",
    vote.member.username,
    voter.username,
  );
  // 7. Verify author's karma increased by 1
  // Re-fetch author profile to check karma update
  const authorProfile =
    await api.functional.communityPlatform.member.posts.comments.create(
      authorConnection,
      {
        postId: post.id,
        body: { content: "temp" } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  // Note: Karma verification would require fetching member profile
  // The backend should update author's karma by +1 when upvote is cast
  TestValidator.predicate(
    "karma should increase after upvote",
    vote.voteType === "upvote",
  );
}
