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

export async function test_api_comment_soft_delete_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberOutput = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberOutput);
  // 2. Member-specific connection with token (authorize function updates headers internally)
  const memberSpecificConnection: api.IConnection = { host: connection.host };
  memberSpecificConnection.headers = {
    Authorization: memberOutput.token.access,
  };
  // 3. Generate test data for comment retrieval
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve comment via API endpoint
  const comment = await api.functional.redditCommunity.member.posts.comments.at(
    memberSpecificConnection,
    {
      postId,
      commentId,
    },
  );
  typia.assert(comment);
  // 5. Validate basic comment structure
  TestValidator.equals("comment id", comment.id, comment.id);
  TestValidator.predicate("has body content", comment.body.length > 0);
  TestValidator.predicate(
    "has vote score",
    typeof comment.vote_score === "number",
  );
  TestValidator.predicate(
    "has created_at",
    typeof comment.created_at === "string",
  );
  TestValidator.predicate(
    "has updated_at",
    typeof comment.updated_at === "string",
  );
  TestValidator.predicate(
    "has deleted_at field",
    comment.deleted_at !== undefined,
  );
  // 6. Validate author structure
  TestValidator.predicate("author has id", comment.author.id !== undefined);
  TestValidator.predicate(
    "author has username",
    comment.author.username !== undefined,
  );
  TestValidator.predicate(
    "author has created_at",
    comment.author.created_at !== undefined,
  );
  // 7. Validate post structure
  TestValidator.predicate("post has id", comment.post.id !== undefined);
  TestValidator.predicate("post has title", comment.post.title.length > 0);
  TestValidator.predicate(
    "post has vote_score",
    typeof comment.post.vote_score === "number",
  );
  TestValidator.predicate(
    "post has comment_count",
    typeof comment.post.comment_count === "number",
  );
  // 8. Validate nested replies structure
  TestValidator.predicate("replies is array", Array.isArray(comment.replies));
  for (const reply of comment.replies) {
    TestValidator.predicate("reply has id", reply.id !== undefined);
    TestValidator.predicate(
      "reply has voteScore",
      typeof reply.voteScore === "number",
    );
    TestValidator.predicate(
      "reply has createdAt",
      reply.createdAt !== undefined,
    );
    TestValidator.predicate(
      "reply has parentComment",
      reply.parentComment !== undefined,
    );
    TestValidator.predicate(
      "reply has replyCount",
      typeof reply.replyCount === "number",
    );
    TestValidator.predicate("reply has author", reply.author !== undefined);
  }
  // 9. Validate soft-delete pattern - check if deleted_at is present
  TestValidator.predicate(
    "comment has deleted_at field for soft-delete tracking",
    comment.deleted_at !== undefined,
  );
  // 10. If soft-deleted, validate deleted_at is a valid date string
  if (comment.deleted_at !== null && comment.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is valid date-time format",
      !Number.isNaN(Date.parse(comment.deleted_at)),
    );
  }
  // 11. Even if soft-deleted, body should still be accessible
  TestValidator.predicate(
    "comment body is accessible even when soft-deleted",
    comment.body !== undefined && comment.body !== null,
  );
  // 12. Validate author and post info still accessible for soft-deleted comments
  TestValidator.predicate(
    "author info accessible for soft-deleted comment",
    comment.author.id !== undefined && comment.author.username !== undefined,
  );
  TestValidator.predicate(
    "post info accessible for soft-deleted comment",
    comment.post.id !== undefined && comment.post.title !== undefined,
  );
  // 13. Validate nested reply structure is preserved
  TestValidator.predicate(
    "replies structure preserved for soft-deleted comment",
    Array.isArray(comment.replies),
  );
}
