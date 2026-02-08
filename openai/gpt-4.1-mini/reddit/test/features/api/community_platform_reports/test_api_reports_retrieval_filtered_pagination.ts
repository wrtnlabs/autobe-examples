import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_reports_retrieval_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Prepare moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Construct a realistic filter request body, empty because IRequest has no properties
  const body = {} satisfies Parameters<
    typeof api.functional.communityPlatform.reports.index
  >[1]["body"];
  // Call API to get filtered reports
  const output = await api.functional.communityPlatform.reports.index(
    moderatorConnection,
    {
      body,
    },
  );
  // Assert output type
  typia.assert(output);
  // Validate pagination metadata correctness
  TestValidator.predicate(
    "pagination current page is positive integer",
    output.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative integer",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative integer",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative integer",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages matches records and limit calculation",
    output.pagination.pages ===
      (output.pagination.limit === 0
        ? 0
        : Math.ceil(output.pagination.records / output.pagination.limit)),
  );
}
