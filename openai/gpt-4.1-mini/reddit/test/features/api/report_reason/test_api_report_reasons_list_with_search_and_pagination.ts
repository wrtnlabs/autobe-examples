import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportReason";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_reasons_list_with_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Use a separate connection for the test to safely invoke API
  const testConnection: api.IConnection = { host: connection.host };
  // Define the search string for substring match in reasonText
  const search = "ab"; // common substring to match sample reasons
  // Specify pagination parameters: page 2 and limit 5
  const page = 2;
  const limit = 5;
  // Call the API with the specified search filter and pagination
  const response = await api.functional.communityPlatform.reportReasons.index(
    testConnection,
    {
      body: {
        search,
        page,
        limit,
      } satisfies ICommunityPlatformReportReason.IRequest,
    },
  );
  // Validate the entire response structure
  typia.assert(response);
  // Validate pagination metadata correlates with request
  const { pagination, data } = response;
  TestValidator.equals("pagination current page", pagination.current, page);
  TestValidator.equals("pagination limit", pagination.limit, limit);
  TestValidator.predicate(
    "pagination current not exceed pages",
    pagination.current <= pagination.pages,
  );
  // Validate data array items match the search criteria
  data.forEach((reason) => {
    typia.assert(reason);
    // Each reasonText must contain the search substring
    TestValidator.predicate(
      `reasonText includes search substring ('${search}')`,
      reason.reasonText.includes(search),
    );
  });
  // Additional validation: check if the actual count respects pagination
  TestValidator.predicate(
    "data length does not exceed limit",
    data.length <= limit,
  );
}
