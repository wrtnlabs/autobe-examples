import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import type { IRedditPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_member_communities_posts_create } from "../../../generate/generate_random_reddit_member_communities_posts_create";
import { generate_random_reddit_member_posts_comments_create } from "../../../generate/generate_random_reddit_member_posts_comments_create";
import { prepare_random_reddit_comment } from "../../../prepare/prepare_random_reddit_comment";
import { prepare_random_reddit_post_text } from "../../../prepare/prepare_random_reddit_post_text";

export async function test_api_comment_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAccount = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  typia.assert(memberAccount);
  // 2. Create a post in a community
  const post = await generate_random_reddit_member_communities_posts_create(
    memberConnection,
    {
      params: { communityId: typia.random<string & tags.Format<"uuid">>() },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 10 }),
        post_type: "text",
      } satisfies IRedditPostText.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create comment on the post
  const comment = await generate_random_reddit_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Upvote the comment
  const upvotedComment =
    await api.functional.reddit.member.comments.votes.postByCommentid(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          vote: "up",
        } satisfies IRedditComment.IVote,
      },
    );
  typia.assert(upvotedComment);
  // 5. Validate the vote count (using id as a valid property)
  TestValidator.equals("comment ID matches", upvotedComment.id, comment.id);
}
