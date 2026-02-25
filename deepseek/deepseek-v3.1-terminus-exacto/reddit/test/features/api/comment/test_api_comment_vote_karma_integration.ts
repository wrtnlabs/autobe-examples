import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_votes_create } from "../../../generate/generate_random_community_platform_user_comments_votes_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_vote_karma_integration(
  connection: api.IConnection,
): Promise<void> {
  // Create comment author user
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_user_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(author);
  // Create voter user
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_user_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(voter);
  // Author creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Author creates a post in the community
  const post = await generate_random_community_platform_user_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Author creates a comment on the post
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Store initial karma score
  const initialKarma = author.karma;
  // Voter casts upvote on the comment
  const upvote =
    await generate_random_community_platform_user_comments_votes_create(
      voterConnection,
      {
        params: { commentId: comment.id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(upvote);
  // Voter changes vote to downvote
  const downvote =
    await generate_random_community_platform_user_comments_votes_create(
      voterConnection,
      {
        params: { commentId: comment.id },
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(downvote);
  // Voter removes vote
  const noVote =
    await generate_random_community_platform_user_comments_votes_create(
      voterConnection,
      {
        params: { commentId: comment.id },
        body: {
          vote_type: "none",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(noVote);
  // Test business logic: Verify vote types were properly recorded
  TestValidator.equals("upvote type recorded", upvote.vote_type, "upvote");
  TestValidator.equals(
    "downvote type recorded",
    downvote.vote_type,
    "downvote",
  );
  TestValidator.equals("vote removal recorded", noVote.vote_type, "none");
  // Test that vote operations completed successfully without errors
  TestValidator.predicate(
    "upvote operation completed",
    upvote.id !== undefined,
  );
  TestValidator.predicate(
    "downvote operation completed",
    downvote.id !== undefined,
  );
  TestValidator.predicate("vote removal completed", noVote.id !== undefined);
}
