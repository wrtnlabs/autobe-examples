import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_comment_vote_retrieve_all(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve a paginated list of all comment votes without filters (defaults apply)
  const adminConnection: api.IConnection = { host: connection.host };
  // Directly request without any filter (no commentId, no userId, no voteType, default pagination)
  const output = await api.functional.communityPlatform.commentVotes.index(
    adminConnection,
    {
      body: {},
    },
  );
  // Validate the structure of the output
  typia.assert(output);
  // Pagination checks
  const pagination = output.pagination;
  TestValidator.predicate(
    "pagination current is >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is >= 1", pagination.limit >= 1);
  TestValidator.predicate(
    "pagination records is >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages is >= 0", pagination.pages >= 0);
  // If records > 0 then pages * limit >= records
  if (pagination.records > 0) {
    TestValidator.predicate(
      "pagination pages * limit >= records",
      pagination.pages * pagination.limit >= pagination.records,
    );
  } else {
    // If no records, pages should be zero or one depending on implementation
    TestValidator.predicate(
      "pagination pages is zero or one when no records",
      pagination.pages === 0 || pagination.pages === 1,
    );
  }
  // Data list checks
  if (output.data.length > 0) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    output.data.forEach((item, index) => {
      typia.assert(item);
      TestValidator.predicate(
        `data[${index}].id is UUID format`,
        typeof item.id === "string" && uuidRegex.test(item.id),
      );
      TestValidator.predicate(
        `data[${index}].communityPlatformCommentId is UUID format`,
        typeof item.communityPlatformCommentId === "string" &&
          uuidRegex.test(item.communityPlatformCommentId),
      );
      TestValidator.predicate(
        `data[${index}].voteType is valid`,
        item.voteType === "upvote" || item.voteType === "downvote",
      );
      TestValidator.predicate(
        `data[${index}].createdAt is ISO date-time`,
        !isNaN(Date.parse(item.createdAt)),
      );
      TestValidator.predicate(
        `data[${index}].updatedAt is ISO date-time`,
        !isNaN(Date.parse(item.updatedAt)),
      );
      TestValidator.predicate(
        `data[${index}].deletedAt is ISO date-time or null`,
        item.deletedAt === null || !isNaN(Date.parse(item.deletedAt)),
      );
    });
  }
}
