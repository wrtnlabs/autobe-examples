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

export async function test_api_reports_retrieval_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // We prepare a connection object (same as base connection since no authentication details are specified)
  const baseConnection = { host: connection.host };
  // Prepare the request body which asks for reports using empty filter criteria
  // As per ICommunityPlatformReport.IRequest type, which is an empty object
  const body: ICommunityPlatformReport.IRequest = {};
  // Call the API to retrieve reports with empty filters, expecting empty results
  const output = await api.functional.communityPlatform.reports.index(
    baseConnection,
    {
      body,
    },
  );
  // Validate that the returned output matches the expected pagination summary schema
  typia.assert(output);
  // Validation on empty data array
  TestValidator.equals("data array length", output.data.length, 0);
  // Check that pagination object exists and has the correct pagination properties for empty results
  TestValidator.predicate(
    "pagination object present",
    output.pagination !== null && output.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination records count",
    output.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages count", output.pagination.pages, 0);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  // We don't check limit explicitly because it can be any non-negative integer (not specified and optional)
}
