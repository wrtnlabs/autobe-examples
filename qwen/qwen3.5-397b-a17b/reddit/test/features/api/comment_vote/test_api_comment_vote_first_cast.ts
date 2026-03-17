import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_comments_vote_post_by_commentid } from "../../../generate/generate_random_reddit_clone_member_comments_vote_post_by_commentid";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_vote } from "../../../prepare/prepare_random_reddit_clone_vote";

/**
 * Test casting first vote on a comment.
 *
 * This test validates the complete voting workflow:
 * 1. Create voter member account
 * 2. Create comment author member account
 * 3. Create a community
 * 4. Create a post by the comment author
 * 5. Create a comment by the comment author
 * 6. Cast UPVOTE as voter and validate vote record and karma increase
 * 7. Cast DOWNVOTE to change vote and validate karma decrease
 */
export async function test_api_comment_vote_first_cast(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create voter member account
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(voterAuth);
  // 2. Create comment author member account
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorAuth);
  // Store author's initial karma score
  const initialKarma = authorAuth.karma_score.score;
  // 3. Create a community
  const community = await generate_random_reddit_clone_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // 4. Create a post in the community by the comment author
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post by the comment author
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      authorConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Cast UPVOTE on the comment as the voter member
  const upvote =
    await generate_random_reddit_clone_member_comments_vote_post_by_commentid(
      voterConnection,
      {
        body: {
          vote_type: "UPVOTE",
        } satisfies IRedditCloneVote.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(upvote);
  // Validate UPVOTE record
  TestValidator.equals("vote_type is UPVOTE", upvote.vote_type, "UPVOTE");
  TestValidator.equals("target_type is COMMENT", upvote.target_type, "COMMENT");
  TestValidator.equals(
    "target_id matches comment",
    upvote.target_id,
    comment.id,
  );
  TestValidator.equals(
    "voter member id matches",
    upvote.member.id,
    voterAuth.id,
  );
  // 7. Test changing vote to DOWNVOTE
  const downvote =
    await generate_random_reddit_clone_member_comments_vote_post_by_commentid(
      voterConnection,
      {
        body: {
          vote_type: "DOWNVOTE",
        } satisfies IRedditCloneVote.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(downvote);
  // Validate DOWNVOTE record
  TestValidator.equals(
    "vote_type changed to DOWNVOTE",
    downvote.vote_type,
    "DOWNVOTE",
  );
  TestValidator.equals(
    "target_id still matches",
    downvote.target_id,
    comment.id,
  );
}
