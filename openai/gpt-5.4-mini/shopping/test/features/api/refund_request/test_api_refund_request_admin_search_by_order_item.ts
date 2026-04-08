import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_refund_request_admin_search_by_order_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator refund-request search by order item.
   *
   * Validates that administrators can query refund requests for a single order item and receive a paginated list scoped to that item.
   * The test verifies the response contract, summary structure, lifecycle metadata, and stable default ordering across repeated requests.
   *
   * 1. Authenticate an administrator using a dedicated connection.
   * 2. Query refund requests for a specific order item with pagination controls.
   * 3. Validate the response pagination and summary records.
   * 4. Repeat the query and confirm the first record ordering remains stable.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Aa",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformRefundRequest.IRequest;
  const output =
    await api.functional.mallPlatform.administrator.orderItems.refundRequests.index(
      adminConnection,
      {
        orderItemId,
        body,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current page is first page",
    output.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data is an array",
    Array.isArray(output.data),
  );
  for (const refundRequest of output.data) {
    typia.assert(refundRequest);
    TestValidator.predicate(
      "refund request reason is present",
      refundRequest.reason.length > 0,
    );
    TestValidator.predicate(
      "refund request status is present",
      refundRequest.status.length > 0,
    );
    TestValidator.predicate(
      "refund request has a created timestamp",
      refundRequest.createdAt.length > 0,
    );
    TestValidator.predicate(
      "refund request has an updated timestamp",
      refundRequest.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "refund request reviewedAt is nullable timestamp",
      refundRequest.reviewedAt === null || refundRequest.reviewedAt.length > 0,
    );
    TestValidator.predicate(
      "refund request reviewNote is nullable text",
      refundRequest.reviewNote === null || refundRequest.reviewNote.length >= 0,
    );
    TestValidator.predicate(
      "refund request deletedAt is nullable timestamp",
      refundRequest.deletedAt === null || refundRequest.deletedAt.length > 0,
    );
  }
  const repeated =
    await api.functional.mallPlatform.administrator.orderItems.refundRequests.index(
      adminConnection,
      {
        orderItemId,
        body,
      },
    );
  typia.assert(repeated);
  TestValidator.equals(
    "stable first refund request ordering",
    repeated.data[0]?.id,
    output.data[0]?.id,
  );
}
