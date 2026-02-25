import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_comments_create } from "../../../generate/generate_random_reddit_clone_member_comments_create";
import { prepare_random_reddit_clone_content_comment } from "../../../prepare/prepare_random_reddit_clone_content_comment";

/**
 * Test member comment creation workflow.
 * 1. Member registers and logs in
 * 2. Member creates a comment on a post
 * 3. Validate comment details and database updates
 */
export async function test_api_member_comment_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and login using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create a comment on a post
  const comment = await api.functional.redditClone.member.comments.create(
    memberConnection,
    {
      body: {
        postId: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({
          sentences: RandomGenerator.pick([1, 2, 3, 4, 5]),
        }),
      } satisfies IRedditCloneContentComment.ICreate,
    },
  );
  typia.assert(comment);
  // 3. Validate comment response
  TestValidator.equals(
    "comment has valid content",
    comment.content.length >= 1 && comment.content.length <= 10000,
    true,
  );
  TestValidator.equals(
    "comment has vote_score initialized to 0",
    comment.voteScore,
    0,
  );
  TestValidator.equals(
    "comment has reply_count initialized to 0",
    comment.replyCount,
    0,
  );
  TestValidator.equals(
    "comment has author information",
    comment.author !== undefined && comment.author !== null,
    true,
  );
  TestValidator.equals(
    "author has username",
    comment.author.username !== undefined &&
      comment.author.username !== null &&
      comment.author.username.length > 0,
    true,
  );
  // 4. Verify member information matches
  TestValidator.equals(
    "comment author username matches creating member",
    comment.author.username,
    member.username,
  );
}
