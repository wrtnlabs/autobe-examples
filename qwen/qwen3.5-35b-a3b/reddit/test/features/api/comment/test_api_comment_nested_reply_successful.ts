import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful nested comment reply creation with unlimited nesting depth.
 * Verifies that comment threads can be nested infinitely with proper parent/child
 * relationships maintained throughout the hierarchy.
 *
 * Test Flow:
 * 1. Create and authenticate a member
 * 2. Create a parent comment (top-level)
 * 3. Create first-level reply (nested under parent)
 * 4. Create second-level reply (nested under first reply)
 * 5. Create third-level reply (nested under second reply)
 * 6. Verify all parent/child relationships are correct
 */
export async function test_api_comment_nested_reply_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member signup and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "password123",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Create parent comment (top-level, requires post_id)
  // Using a random UUID for post_id - in production, this would be a valid post from fixtures
  const parentComment =
    await api.functional.redditPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          post_id: typia.random<string & tags.Format<"uuid">>(),
          content: "This is the parent comment",
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // Verify parent comment is top-level (no parent, has post)
  TestValidator.equals(
    "parent has no parent reference",
    parentComment.parent,
    null,
  );
  TestValidator.predicate(
    "parent has post reference",
    parentComment.post !== null,
  );
  // Step 3: Create first-level nested reply
  const firstReply = await api.functional.redditPlatform.member.comments.create(
    memberConnection,
    {
      body: {
        parent_comment_id: parentComment.id,
        content: "This is the first level reply",
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(firstReply);
  // Verify first reply has correct parent
  TestValidator.equals(
    "first reply has parent",
    firstReply.parent?.id,
    parentComment.id,
  );
  TestValidator.equals("first reply vote score 0", firstReply.vote_score, 0);
  // Step 4: Create second-level nested reply (reply to first reply)
  const secondReply =
    await api.functional.redditPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          parent_comment_id: firstReply.id,
          content: "This is the second level reply",
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(secondReply);
  // Verify second reply has correct parent
  TestValidator.equals(
    "second reply has parent",
    secondReply.parent?.id,
    firstReply.id,
  );
  TestValidator.equals("second reply vote score 0", secondReply.vote_score, 0);
  // Step 5: Create third-level nested reply (reply to second reply)
  const thirdReply = await api.functional.redditPlatform.member.comments.create(
    memberConnection,
    {
      body: {
        parent_comment_id: secondReply.id,
        content: "This is the third level reply",
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(thirdReply);
  // Verify third reply has correct parent
  TestValidator.equals(
    "third reply has parent",
    thirdReply.parent?.id,
    secondReply.id,
  );
  TestValidator.equals("third reply vote score 0", thirdReply.vote_score, 0);
  // Step 6: Verify complete thread hierarchy
  // Check that each level points to correct parent
  TestValidator.equals(
    "thread hierarchy level 1",
    firstReply.parent?.id,
    parentComment.id,
  );
  TestValidator.equals(
    "thread hierarchy level 2",
    secondReply.parent?.id,
    firstReply.id,
  );
  TestValidator.equals(
    "thread hierarchy level 3",
    thirdReply.parent?.id,
    secondReply.id,
  );
  // Verify author is same member for all comments
  TestValidator.equals(
    "parent author",
    parentComment.author.id,
    memberAuth.user.id,
  );
  TestValidator.equals(
    "first reply author",
    firstReply.author.id,
    memberAuth.user.id,
  );
  TestValidator.equals(
    "second reply author",
    secondReply.author.id,
    memberAuth.user.id,
  );
  TestValidator.equals(
    "third reply author",
    thirdReply.author.id,
    memberAuth.user.id,
  );
  // Verify content is preserved correctly
  TestValidator.equals(
    "parent content",
    parentComment.content,
    "This is the parent comment",
  );
  TestValidator.equals(
    "first reply content",
    firstReply.content,
    "This is the first level reply",
  );
  TestValidator.equals(
    "second reply content",
    secondReply.content,
    "This is the second level reply",
  );
  TestValidator.equals(
    "third reply content",
    thirdReply.content,
    "This is the third level reply",
  );
  // Verify each comment has unique ID
  TestValidator.notEquals("parent unique ID", parentComment.id, firstReply.id);
  TestValidator.notEquals(
    "first reply unique ID",
    firstReply.id,
    secondReply.id,
  );
  TestValidator.notEquals(
    "second reply unique ID",
    secondReply.id,
    thirdReply.id,
  );
}
