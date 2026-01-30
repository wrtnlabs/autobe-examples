import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPost";
export async function test_api_content_top_all_time(
  connection: api.IConnection,
): Promise<void> {
  // Create a dummy connection for the test
  const testConnection: api.IConnection = { host: connection.host };
  // Define the request body for top content with 'All Time' time scope
  const requestBody = {
    time_scope: "All Time",
    limit: 20,
  } satisfies ICommunityBbsPost.IRequest;
  // Call the API endpoint to retrieve top content
  const result: IPageICommunityBbsPost.ISummary =
    await api.functional.communityBbs.content.top.index(testConnection, {
      body: requestBody,
    });
  // Validate the response structure with typia.assert
  typia.assert(result);
  // Verify pagination properties
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", result.pagination.limit, 20);
  // Validate that data contains at most 20 items (as specified in limit)
  TestValidator.predicate(
    "data array contains at most 20 items",
    result.data.length <= 20,
  );
  // Verify that author property in each post is correctly structured
  for (const post of result.data) {
    TestValidator.equals(
      "author id is a string",
      typeof post.author.id,
      "string",
    );
    TestValidator.equals(
      "author name is a string",
      typeof post.author.name,
      "string",
    );
    TestValidator.equals(
      "author reputation is a number",
      typeof post.author.reputation,
      "number",
    );
  }
}
