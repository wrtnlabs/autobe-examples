import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tag_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Default pagination parameters (page=1, limit=10)
  const defaultRequest: IDiscussionBoardTag.IRequest = {
    page: 1,
    limit: 10,
  };
  const defaultResponse: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(connection, {
      body: defaultRequest,
    });
  typia.assert(defaultResponse);
  // Verify pagination metadata structure
  TestValidator.equals(
    "default pagination current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // Verify tag summary structure if data exists
  if (defaultResponse.data.length > 0) {
    const firstTag = defaultResponse.data[0];
    typia.assert(firstTag);
    TestValidator.predicate(
      "tag has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstTag.id,
      ),
    );
    TestValidator.predicate("tag has name", firstTag.name.length > 0);
    TestValidator.predicate(
      "tag has created_at",
      firstTag.created_at.length > 0,
    );
    TestValidator.predicate(
      "tag has updated_at",
      firstTag.updated_at.length > 0,
    );
  }
  // Test 2: Custom pagination parameters (page=2, limit=20)
  const customRequest: IDiscussionBoardTag.IRequest = {
    page: 2,
    limit: 20,
  };
  const customResponse: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(connection, {
      body: customRequest,
    });
  typia.assert(customResponse);
  // Verify custom pagination metadata
  TestValidator.equals(
    "custom pagination current page",
    customResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom pagination limit",
    customResponse.pagination.limit,
    20,
  );
  // Test 3: Empty tags scenario - no filters should return all tags
  const emptyRequest: IDiscussionBoardTag.IRequest = {
    page: 1,
    limit: 100,
  };
  const emptyResponse: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(connection, {
      body: emptyRequest,
    });
  typia.assert(emptyResponse);
  // Verify pagination consistency
  TestValidator.equals(
    "empty response current page",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty response limit",
    emptyResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "empty response records >= 0",
    emptyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "empty response pages >= 0",
    emptyResponse.pagination.pages >= 0,
  );
  // If no tags exist, verify empty data array
  if (emptyResponse.pagination.records === 0) {
    TestValidator.equals(
      "empty data array when no records",
      emptyResponse.data.length,
      0,
    );
    TestValidator.equals(
      "pages is 0 when no records",
      emptyResponse.pagination.pages,
      0,
    );
  }
}
