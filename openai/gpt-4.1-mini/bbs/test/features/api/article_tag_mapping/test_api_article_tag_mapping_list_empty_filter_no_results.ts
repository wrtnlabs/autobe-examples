import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";

/**
 * Test retrieval of article-tag mappings with empty filters yielding no data.
 * This test ensures the API returns the correct paginated response with empty data.
 *
 * The test will:
 * 1. Register and authorize a new registered user.
 * 2. Use the user connection to send a PATCH request with empty filter criteria.
 * 3. Assert that the response is valid, the data array is empty, and pagination metadata shows zero records.
 */
export async function test_api_article_tag_mapping_list_empty_filter_no_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register & authorize a new registered user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@example.com",
      password: "TestPassword123!",
    },
  });
  typia.assert(authorized);
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare empty filter request body for article-tag mappings
  const body: IDiscussionBoardArticleTagMapping.IRequest = {
    // empty filter
  };
  // 3. Call the PATCH /discussionBoard/registeredUser/article-tag-mappings endpoint
  const output =
    await api.functional.discussionBoard.registeredUser.article_tag_mappings.index(
      userConnection,
      { body },
    );
  // 4. Assert that output matches IPageIDiscussionBoardArticleTagMapping.ISummary
  typia.assert(output);
  // 5. Test that data array is empty
  TestValidator.equals("data array length should be 0", output.data.length, 0);
  // 6. Test that pagination metadata indicates zero records
  TestValidator.equals(
    "pagination.records should be 0",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0",
    output.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination.current should be 1 or 0",
    output.pagination.current === 0 || output.pagination.current === 1,
    true,
  );
  TestValidator.predicate(
    "pagination.limit should be non-negative",
    output.pagination.limit >= 0,
  );
}
