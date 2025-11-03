import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityContentType";
import type { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";

export async function test_api_reddit_community_content_types_list_public_access(
  connection: api.IConnection,
) {
  // 1. Prepare the request body with page number 1 (minimum required).
  const requestBody = {
    page: 1,
  } satisfies IRedditCommunityContentType.IRequest;

  // 2. Send the PATCH request to fetch paginated content types
  const response: IPageIRedditCommunityContentType.ISummary =
    await api.functional.redditCommunity.redditCommunityContentTypes.index(
      connection,
      { body: requestBody },
    );

  // 3. Assert the response data type is correct
  typia.assert(response);

  // 4. Assert pagination metadata presence and plausible values
  TestValidator.predicate(
    "pagination is object",
    typeof response.pagination === "object",
  );
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative integer",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    response.pagination.pages >= 1,
  );

  // 5. Assert data is array
  TestValidator.predicate("data is array", Array.isArray(response.data));

  // 6. For each content type summary, verify fields
  for (const contentType of response.data) {
    typia.assert(contentType);
    TestValidator.predicate(
      "content type id is uuid string",
      typeof contentType.id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          contentType.id,
        ),
    );
    TestValidator.predicate(
      "content_type_code is non-empty string",
      typeof contentType.content_type_code === "string" &&
        contentType.content_type_code.length > 0,
    );
    TestValidator.predicate(
      "content_type_name is non-empty string",
      typeof contentType.content_type_name === "string" &&
        contentType.content_type_name.length > 0,
    );
    TestValidator.predicate(
      "description is string or null or undefined",
      contentType.description === null ||
        contentType.description === undefined ||
        typeof contentType.description === "string",
    );
  }
}
