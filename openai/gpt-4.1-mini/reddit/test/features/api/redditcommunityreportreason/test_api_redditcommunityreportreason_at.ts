import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportReason";
import type { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";

export async function test_api_redditcommunityreportreason_at(
  connection: api.IConnection,
) {
  // 1. Fetch existing report reasons using the PATCH index endpoint
  const list: IPageIRedditCommunityReportReason.ISummary =
    await api.functional.redditCommunity.redditCommunityReportReasons.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityReportReason.IRequest,
      },
    );
  typia.assert(list);

  // 2. Verify list contains data
  TestValidator.predicate(
    "list data is an array with length > 0",
    Array.isArray(list.data) && list.data.length > 0,
  );

  // 3. Select a valid reasonCode from the list for detailed retrieval
  const validReason = list.data[0];
  typia.assert(validReason);
  TestValidator.predicate(
    "valid reason has reason_code string",
    typeof validReason.reason_code === "string" &&
      validReason.reason_code.length > 0,
  );

  // 4. Retrieve detailed report reason by reasonCode
  const detail: IRedditCommunityReportReason =
    await api.functional.redditCommunity.redditCommunityReportReasons.at(
      connection,
      {
        reasonCode: validReason.reason_code,
      },
    );
  typia.assert(detail);

  // 5. Validate returned detail fields
  TestValidator.equals(
    "detail.reason_code matches requested reason_code",
    detail.reason_code,
    validReason.reason_code,
  );
  TestValidator.equals(
    "detail.reason_name matches summary reason_name",
    detail.reason_name,
    validReason.reason_name,
  );
  typia.assert<string & tags.Format<"uuid">>(detail.id);
  TestValidator.predicate(
    "detail.created_at is ISO date-time string",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "detail.updated_at is ISO date-time string",
    typeof detail.updated_at === "string" && detail.updated_at.length > 0,
  );

  // 6. Negative test: request with non-existent reasonCode must produce error
  await TestValidator.error(
    "non-existent reasonCode throws error",
    async () => {
      await api.functional.redditCommunity.redditCommunityReportReasons.at(
        connection,
        {
          reasonCode: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
