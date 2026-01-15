import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCitizen";
export async function test_api_citizen_search_by_username_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Search with empty criteria to validate response structure
  const emptySearch: IDiscussionBoardCitizen.IRequest = {};
  const result: IPageIDiscussionBoardCitizen.ISummary =
    await api.functional.discussionBoard.citizens.index(adminConnection, {
      body: emptySearch,
    });
  typia.assert(result);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page is at least 1",
    result.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit is at least 1",
    result.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "pagination records is at least 0",
    result.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is at least 0",
    result.pagination.pages >= 0,
    true,
  );
  // Validate data structure
  TestValidator.predicate("data is an array", Array.isArray(result.data));
  // If there are any citizens, validate the structure of items
  if (result.data.length > 0) {
    // Verify each item has the correct structure
    for (const citizen of result.data) {
      TestValidator.equals(
        "citizen has id",
        typeof citizen.id === "string",
        true,
      );
      TestValidator.equals(
        "citizen has username",
        typeof citizen.username === "string",
        true,
      );
      TestValidator.predicate(
        "citizen username length",
        citizen.username.length >= 3,
      );
      TestValidator.predicate(
        "citizen username length max",
        citizen.username.length <= 50,
      );
      TestValidator.equals(
        "citizen has account_status",
        citizen.account_status === "active" ||
          citizen.account_status === "suspended" ||
          citizen.account_status === "banned",
        true,
      );
    }
    // If any citizen has a username, test username substring search
    const sampleCitizen = result.data[0];
    if (sampleCitizen.username && sampleCitizen.username.length >= 3) {
      const substringSearch: IDiscussionBoardCitizen.IRequest = {
        username: sampleCitizen.username.substring(0, 3),
      };
      const substringResult: IPageIDiscussionBoardCitizen.ISummary =
        await api.functional.discussionBoard.citizens.index(adminConnection, {
          body: substringSearch,
        });
      typia.assert(substringResult);
      // Verify results contain data
      TestValidator.predicate(
        "substring search returned results",
        substringResult.data.length > 0,
      );
      // Check that all returned citizens contain the substring
      for (const matchedCitizen of substringResult.data) {
        TestValidator.predicate(
          "matched citizen contains substring",
          matchedCitizen.username.includes(
            sampleCitizen.username.substring(0, 3),
          ),
        );
      }
    }
  }
  // Test status filter with valid status
  if (result.data.length > 0) {
    const sampleCitizen = result.data[0];
    const statusFilter: IDiscussionBoardCitizen.IRequest = {
      status: sampleCitizen.account_status,
    };
    const statusResult: IPageIDiscussionBoardCitizen.ISummary =
      await api.functional.discussionBoard.citizens.index(adminConnection, {
        body: statusFilter,
      });
    typia.assert(statusResult);
    // Verify results contain data
    TestValidator.predicate(
      "status search returned results",
      statusResult.data.length > 0,
    );
    // Check that all returned citizens have the correct status
    for (const matchedCitizen of statusResult.data) {
      TestValidator.equals(
        "matched citizen has correct status",
        matchedCitizen.account_status,
        sampleCitizen.account_status,
      );
    }
  }
}
