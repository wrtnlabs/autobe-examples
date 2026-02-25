import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarma";
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
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_content_comment } from "../../../prepare/prepare_random_reddit_clone_content_comment";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";

export async function test_api_karma_record_comment_voting(
  connection: api.IConnection,
): Promise<void> {
  // Create user for testing
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.redditClone.auth.member.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(user);
  // Update connection with user's token
  userConnection.headers = { Authorization: user.token.access };
  // Create a post for comment
  const post = await api.functional.redditClone.member.posts.create(
    userConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 3 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(post);
  // Create a comment
  const comment = await api.functional.redditClone.member.comments.create(
    userConnection,
    {
      body: {
        postId: post.id,
        content: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditCloneContentComment.ICreate,
    },
  );
  typia.assert(comment);
  // Upvote the comment to generate karma
  const voteResponse = await api.functional.redditClone.member.comments.upvote(
    userConnection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(voteResponse);
  // Retrieve the karma record (assuming karma record is created automatically)
  const karmaRecord = await api.functional.redditClone.karmas.at(
    userConnection,
    {
      karmaId: user.id,
    },
  );
  typia.assert(karmaRecord);
  // Verify karma score reflects comment voting
  TestValidator.predicate(
    "karma score positive after upvote",
    karmaRecord.totalScore > 0,
  );
}
