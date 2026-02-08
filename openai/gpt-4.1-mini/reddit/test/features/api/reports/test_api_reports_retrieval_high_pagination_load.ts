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

export async function test_api_reports_retrieval_high_pagination_load(
  connection: api.IConnection,
): Promise<void> {
  // Create admin/moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Make single call with empty IRequest as pagination parameters are not in IRequest
  const output = await api.functional.communityPlatform.reports.index(
    moderatorConnection,
    {
      body: {} satisfies ICommunityPlatformReport.IRequest,
    },
  );
  typia.assert(output);
  // Validate pagination metadata presence
  TestValidator.predicate(
    "pagination object exists",
    output.pagination !== null && output.pagination !== undefined,
  );
  // Validate pagination logical fields
  TestValidator.predicate(
    "pagination current page number non-negative",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit non-negative",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count non-negative",
    output.pagination.pages >= 0,
  );
  // Validate data length is consistent with pagination limit
  TestValidator.predicate(
    "data length no more than pagination limit",
    output.data.length <= output.pagination.limit,
  );
}
