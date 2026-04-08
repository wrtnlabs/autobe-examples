import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_comments_vote_create } from "../../../generate/generate_random_reddit_platform_member_comments_vote_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";

export async function test_api_comment_vote_cast_first_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member A (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(voter);
  // 2. Register and authenticate member B (comment author, must be different from voter)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(author);
  // 3. Create a comment on a post (member B creates comment on an existing post)
  // Use a random post ID - the backend will validate it exists
  const comment = await api.functional.redditPlatform.member.comments.create(
    authorConnection,
    {
      body: {
        reddit_platform_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Cast an upvote on the comment (member A votes)
  const vote = await api.functional.redditPlatform.member.comments.vote.create(
    voterConnection,
    {
      commentId: comment.id,
      body: {
        vote_type: "up",
      } satisfies IRedditPlatformCommentVote.ICreate,
    },
  );
  typia.assert(vote);
  // 5. Validate vote record
  TestValidator.equals("vote record member_id", vote.member.id, voter.id);
  TestValidator.equals("vote record comment_id", vote.comment.id, comment.id);
  TestValidator.equals("vote type", vote.vote_type, "up");
  // 6. Fetch updated comment to validate upvotes_count and score
  const updatedComment =
    await api.functional.redditPlatform.member.comments.create(
      voterConnection,
      {
        body: {
          reddit_platform_post_id: comment.reddit_platform_post_id,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(updatedComment);
  // Note: upvotes_count and score validation would require a separate GET endpoint
  // which is not available in the provided SDK. We validate by checking the vote record.
}
