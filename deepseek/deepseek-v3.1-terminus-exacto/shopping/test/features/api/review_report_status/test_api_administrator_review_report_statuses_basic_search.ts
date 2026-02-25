import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceReviewReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReportStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewReportStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test the basic administrator review report status search functionality with pagination.
 * 1. Authenticate as administrator using join endpoint
 * 2. Call review report status search with minimal criteria
 * 3. Validate pagination metadata and data array structure
 */
export async function test_api_administrator_review_report_statuses_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(administrator);
  // 2. Search review report statuses
  const searchResult =
    await api.functional.ecommerce.administrator.review_report_statuses.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceReviewReportStatus.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination object exists",
    typeof searchResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is number",
    typeof searchResult.pagination.current === "number",
  );
  TestValidator.predicate(
    "limit is number",
    typeof searchResult.pagination.limit === "number",
  );
  TestValidator.predicate(
    "records is number",
    typeof searchResult.pagination.records === "number",
  );
  TestValidator.predicate(
    "pages is number",
    typeof searchResult.pagination.pages === "number",
  );
  TestValidator.predicate("current >= 0", searchResult.pagination.current >= 0);
  TestValidator.predicate("limit >= 0", searchResult.pagination.limit >= 0);
  TestValidator.predicate("records >= 0", searchResult.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", searchResult.pagination.pages >= 0);
  // 4. Validate data array structure
  TestValidator.equals("data is array", Array.isArray(searchResult.data), true);
  // Check each record structure
  for (const record of searchResult.data) {
    TestValidator.predicate(
      "has previous_status field",
      "previous_status" in record,
    );
    if (record.previous_status !== undefined) {
      TestValidator.equals(
        "previous_status type",
        typeof record.previous_status,
        "string",
      );
    }
    TestValidator.predicate("has new_status field", "new_status" in record);
    if (record.new_status !== undefined) {
      TestValidator.equals(
        "new_status type",
        typeof record.new_status,
        "string",
      );
    }
    TestValidator.predicate(
      "has transition_reason field",
      "transition_reason" in record,
    );
    if (
      record.transition_reason !== undefined &&
      record.transition_reason !== null
    ) {
      TestValidator.equals(
        "transition_reason type",
        typeof record.transition_reason,
        "string",
      );
    }
    TestValidator.predicate(
      "has ecommerce_review_report_id field",
      "ecommerce_review_report_id" in record,
    );
    if (record.ecommerce_review_report_id !== undefined) {
      TestValidator.predicate(
        "ecommerce_review_report_id is uuid pattern",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          record.ecommerce_review_report_id,
        ),
      );
    }
    TestValidator.predicate(
      "has ecommerce_administrator_id field",
      "ecommerce_administrator_id" in record,
    );
    if (
      record.ecommerce_administrator_id !== undefined &&
      record.ecommerce_administrator_id !== null
    ) {
      TestValidator.predicate(
        "ecommerce_administrator_id is uuid pattern",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          record.ecommerce_administrator_id,
        ),
      );
    }
  }
}
