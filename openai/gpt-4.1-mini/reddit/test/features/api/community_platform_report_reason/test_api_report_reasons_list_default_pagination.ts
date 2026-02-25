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

export async function test_api_report_reasons_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Prepare actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // No utility function provided for authorization, assume endpoint allows anonymous or no auth for this test
  // Construct request body with default pagination parameters: no search, page 1, no limit specified (defaults will apply)
  const body: ICommunityPlatformReportReason.IRequest = {
    search: undefined,
    page: undefined,
    limit: undefined,
  };
  // Call the API
  const response = await api.functional.communityPlatform.reportReasons.index(
    userConnection,
    { body },
  );
  // Validate the full response structure
  typia.assert(response);
  // Validate pagination info existence and non-negative numbers
  TestValidator.predicate(
    "pagination current page at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  // Validate that each report reason item has required fields
  response.data.forEach((item, index) => {
    // Validate single item
    typia.assert(item);
    // Validate id is a UUID string of length 36
    TestValidator.predicate(
      `item ${index} id is UUID length 36`,
      typeof item.id === "string" && item.id.length === 36,
    );
    // Validate reasonText is a non-empty string
    TestValidator.predicate(
      `item ${index} reasonText not empty`,
      typeof item.reasonText === "string" && item.reasonText.length > 0,
    );
    // Validate timestamps are string and ISO 8601 date-time
    ["createdAt", "updatedAt"].forEach((field) => {
      const value = item[field as keyof typeof item];
      TestValidator.predicate(
        `item ${index} field ${field} is ISO date-time string`,
        typeof value === "string" && !Number.isNaN(Date.parse(value)),
      );
    });
    // deletedAt can be string or null
    if (item.deletedAt !== null) {
      TestValidator.predicate(
        `item ${index} deletedAt is ISO date-time string or null`,
        typeof item.deletedAt === "string" &&
          !Number.isNaN(Date.parse(item.deletedAt)),
      );
    }
  });
  // Validate ascending order by reasonText
  for (let i = 0; i < response.data.length - 1; i++) {
    TestValidator.predicate(
      `reasonText ascending order between ${i} and ${i + 1}`,
      response.data[i].reasonText.localeCompare(
        response.data[i + 1].reasonText,
      ) <= 0,
    );
  }
}
