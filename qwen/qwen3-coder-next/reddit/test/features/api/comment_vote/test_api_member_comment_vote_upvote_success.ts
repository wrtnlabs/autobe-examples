import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_comments_create } from "../../../generate/generate_random_reddit_clone_member_comments_create";
import { generate_random_reddit_clone_member_comments_vote } from "../../../generate/generate_random_reddit_clone_member_comments_vote";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment_vote } from "../../../prepare/prepare_random_reddit_clone_comment_vote";
import { prepare_random_reddit_clone_content_comment } from "../../../prepare/prepare_random_reddit_clone_content_comment";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";

export async function test_api_member_comment_vote_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // Create post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.name(),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // Create comment on the post
  const comment = await generate_random_reddit_clone_member_comments_create(
    memberConnection,
    {
      body: {
        postId: post.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(comment);
  // Get initial vote score
  const initialScore = comment.voteScore;
  // Perform upvote
  const voteResponse = await api.functional.redditClone.member.comments.vote(
    memberConnection,
    {
      commentId: comment.id,
      body: {
        voteType: "upvote",
      } satisfies IRedditCloneCommentVote.ICreate,
    },
  );
  typia.assert(voteResponse);
  // Validate vote response
  TestValidator.equals(
    "vote score increased by 1",
    voteResponse.voteScore,
    initialScore + 1,
  );
  TestValidator.equals(
    "user vote status is upvote",
    voteResponse.userVote,
    "upvote",
  );
}
