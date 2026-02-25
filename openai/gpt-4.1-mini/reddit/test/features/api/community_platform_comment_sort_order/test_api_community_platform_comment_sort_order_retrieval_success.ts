import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_comment_sort_order_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID as commentSortOrderId for retrieval
  const commentSortOrderId = typia.random<string & tags.Format<"uuid">>();
  // Perform the retrieval call
  const response = await api.functional.communityPlatform.commentSortOrders.at(
    userConnection,
    {
      commentSortOrderId,
    },
  );
  // Assert the response matches the expected schema
  typia.assert(response);
  // Validate id matches the requested commentSortOrderId
  TestValidator.equals("id matches input", response.id, commentSortOrderId);
  // Validate communityPlatformCommentId is a valid UUID string
  TestValidator.predicate(
    "communityPlatformCommentId is a valid UUID",
    typeof response.communityPlatformCommentId === "string" &&
      response.communityPlatformCommentId.length > 0,
  );
  // Validate strategy is a non-empty string
  TestValidator.predicate(
    "strategy is non-empty string",
    typeof response.strategy === "string" && response.strategy.length > 0,
  );
  // Validate sortValue is a number
  TestValidator.predicate(
    "sortValue is a number",
    typeof response.sortValue === "number",
  );
  // Validate createdAt and updatedAt are valid ISO date-time strings
  TestValidator.predicate(
    "createdAt is ISO date-time",
    typeof response.createdAt === "string" &&
      !isNaN(Date.parse(response.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time",
    typeof response.updatedAt === "string" &&
      !isNaN(Date.parse(response.updatedAt)),
  );
  // Validate deletedAt is either null or a valid ISO date-time string
  if (response.deletedAt !== null && response.deletedAt !== undefined) {
    TestValidator.predicate(
      "deletedAt is ISO date-time or null",
      typeof response.deletedAt === "string" &&
        !isNaN(Date.parse(response.deletedAt)),
    );
  } else {
    TestValidator.predicate(
      "deletedAt is null or undefined",
      response.deletedAt === null || response.deletedAt === undefined,
    );
  }
}
