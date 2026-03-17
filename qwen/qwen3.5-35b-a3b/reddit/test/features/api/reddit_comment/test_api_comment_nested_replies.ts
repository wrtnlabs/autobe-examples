import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_nested_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - create authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Get comment with potential nested replies
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.at(
      memberConnection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        commentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(comment);
  // 3. Validate comment entity structure
  TestValidator.equals("comment has id", comment.id !== undefined, true);
  TestValidator.equals("comment has body", comment.body.length > 0, true);
  TestValidator.equals(
    "comment has vote_score",
    typeof comment.vote_score === "number",
    true,
  );
  TestValidator.equals(
    "comment has created_at",
    comment.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "comment has updated_at",
    comment.updated_at !== undefined,
    true,
  );
  // 4. Validate author and post fields
  TestValidator.equals(
    "comment has author",
    comment.author !== undefined,
    true,
  );
  TestValidator.equals(
    "author has username",
    comment.author.username !== undefined,
    true,
  );
  TestValidator.equals("comment has post", comment.post !== undefined, true);
  TestValidator.equals(
    "post has title",
    comment.post.title !== undefined,
    true,
  );
  // 5. Validate parent field for nesting structure
  // parent is null for top-level comments or contains parent ISummary for replies
  TestValidator.predicate(
    "parent is correctly set (null or parent ISummary)",
    comment.parent === null ||
      (comment.parent !== null && comment.parent !== undefined && comment.parent.id !== undefined),
  );
  // 6. Validate replies array and recursive structure
  TestValidator.equals(
    "replies is array",
    Array.isArray(comment.replies),
    true,
  );
  // Validate each reply has correct structure
  for (const reply of comment.replies) {
    typia.assert(reply);
    // Reply must have id
    TestValidator.equals("reply has id", reply.id !== undefined, true);
    // Reply has parentComment field (from ISummary)
    TestValidator.equals(
      "reply has parentComment field",
      reply.parentComment !== undefined,
      true,
    );
    // Check if reply is a full comment or just a summary
    if ("replies" in reply && Array.isArray(reply.replies)) {
      // Validate reply has nested replies array (recursive structure)
      TestValidator.equals(
        "reply has replies array",
        Array.isArray(reply.replies),
        true,
      );
      // Validate each nested reply
      for (const nestedReply of reply.replies) {
        typia.assert(nestedReply);
        // Nested reply should have its own nested replies
        TestValidator.equals(
          "nested reply has replies array",
          Array.isArray(nestedReply.replies),
          true,
        );
      }
    }
  }
  // 7. Validate timestamp formats
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    !isNaN(Date.parse(comment.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    !isNaN(Date.parse(comment.updated_at)),
  );
}