import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_comment_retrieval_with_inverted_context(
  connection: api.IConnection,
) {
  // Step 1: Generate random postCode and commentCode
  const postCode: string = RandomGenerator.alphaNumeric(10);
  const commentCode: string = RandomGenerator.alphaNumeric(8);

  // Step 2: Call the API to retrieve comment with inverted context
  const retrievedComment: ICommunityPlatformComment.IInvert =
    await api.functional.communityPlatform.member.posts.comments.at(
      connection,
      {
        postCode: postCode,
        commentCode: commentCode,
      },
    );
  typia.assert(retrievedComment);

  // Step 3: Validate the structure of the inverted context
  TestValidator.predicate(
    "comment ID is a valid UUID",
    () =>
      typeof retrievedComment.id === "string" &&
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
        retrievedComment.id,
      ),
  );

  // Step 4: Validate the post context matches the required string-based ISummary format
  TestValidator.equals(
    "post context is a string",
    typeof retrievedComment.post,
    "string",
  );

  // Step 5: Validate the author context matches the required string-based ISummary format
  TestValidator.equals(
    "author context is a string",
    typeof retrievedComment.author,
    "string",
  );

  // Step 6: Validate the comment content is a string with maxLength constraint
  TestValidator.predicate(
    "comment content is string and length <= 500",
    () =>
      typeof retrievedComment.content === "string" &&
      retrievedComment.content.length <= 500,
  );

  // Step 7: Validate status is one of the enum values
  TestValidator.predicate("status is valid enum value", () =>
    ["active", "hidden", "deleted", "flagged"].includes(
      retrievedComment.status,
    ),
  );

  // Step 8: Validate createdAt is ISO date-time format
  TestValidator.predicate("createdAt is valid date-time format", () =>
    /^=[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z$/.test(
      retrievedComment.createdAt,
    ),
  );

  // Step 9: Validate updatedAt and editedAt are optional and match their types
  TestValidator.predicate(
    "updatedAt is either undefined or valid date-time",
    () =>
      retrievedComment.updatedAt === undefined ||
      /^=[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z$/.test(
        retrievedComment.updatedAt,
      ),
  );

  TestValidator.predicate(
    "editedAt is either undefined, null, or valid date-time",
    () =>
      retrievedComment.editedAt === undefined ||
      retrievedComment.editedAt === null ||
      /^=[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z$/.test(
        retrievedComment.editedAt,
      ),
  );

  // Step 10: Validate depth, voteScore, reportedCount are optional and match their types
  TestValidator.predicate(
    "depth is undefined or positive int32 <= 10",
    () =>
      retrievedComment.depth === undefined ||
      (Number.isInteger(retrievedComment.depth) &&
        retrievedComment.depth >= 0 &&
        retrievedComment.depth <= 10),
  );

  TestValidator.predicate(
    "voteScore is undefined or integer",
    () =>
      retrievedComment.voteScore === undefined ||
      Number.isInteger(retrievedComment.voteScore),
  );

  TestValidator.predicate(
    "reportedCount is undefined or non-negative integer",
    () =>
      retrievedComment.reportedCount === undefined ||
      (Number.isInteger(retrievedComment.reportedCount) &&
        retrievedComment.reportedCount >= 0),
  );

  // Step 11: Test invalid data (non-existent postCode)
  const invalidPostCode = "nonexistent-post-code";
  const invalidCommentCode = "nonexistent-comment-code";

  await TestValidator.error(
    "non-existent postCode should throw error",
    async () => {
      await api.functional.communityPlatform.member.posts.comments.at(
        connection,
        {
          postCode: invalidPostCode,
          commentCode: invalidCommentCode,
        },
      );
    },
  );
}
