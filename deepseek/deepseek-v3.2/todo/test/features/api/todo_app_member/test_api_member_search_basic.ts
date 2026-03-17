import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMember";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the basic member search functionality with default parameters.
 *
 * This test validates that the search endpoint returns a properly structured
 * pagination response even with minimal or no filtering criteria.
 * Send a request with empty or minimal search parameters (page: 1, limit: 10)
 * and verify the response contains valid pagination metadata and a data array
 * of member summaries. This ensures the endpoint is accessible and returns
 * correctly formatted data for administrative member listing.
 */
export async function test_api_member_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for search operation (following isolation pattern)
  const searchConnection: api.IConnection = { host: connection.host };
  // Since the endpoint has @x-autobe-authorization-type null and @x-autobe-authorization-actor null,
  // no authentication is required.
  const response: IPageITodoAppMember.ISummary =
    await api.functional.todoApp.members.index(searchConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppMember.IRequest,
    });
  // Complete runtime type validation of the response structure
  typia.assert(response);
  // Validate pagination logical constraints
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate pages calculation logic
  if (response.pagination.records === 0) {
    TestValidator.equals(
      "pages should be 0 when records is 0",
      response.pagination.pages,
      0,
    );
  } else {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation matches records/limit",
      response.pagination.pages,
      expectedPages,
    );
  }
}
