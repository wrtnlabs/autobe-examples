import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refund_requests_listing_with_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates to obtain JWT token for subsequent requests
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Test with combined filters: status=pending, date range, and reason_keyword
  // Set date range for the last 30 days
  const createdAtFrom = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAtTo = new Date().toISOString();
  // 3. Request first page with limit=10
  const firstPage =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          created_at_from: createdAtFrom as string & tags.Format<"date-time">,
          created_at_to: createdAtTo as string & tags.Format<"date-time">,
          reason_keyword: "product",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(firstPage);
  // 4. Verify pagination metadata
  TestValidator.predicate(
    "pagination exists",
    firstPage.pagination !== null && firstPage.pagination !== undefined,
  );
  TestValidator.equals("current page", firstPage.pagination.current, 1);
  TestValidator.equals("limit per page", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  // 5. Request second page to verify pagination works
  const secondPage =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          created_at_from: createdAtFrom as string & tags.Format<"date-time">,
          created_at_to: createdAtTo as string & tags.Format<"date-time">,
          reason_keyword: "product",
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(secondPage);
  // 6. Verify second page pagination metadata
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  // 7. Verify pagination consistency - total records should be same
  TestValidator.equals(
    "total records consistent",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "total pages consistent",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
  // 8. If there are refund requests, verify structure of data items
  if (firstPage.data.length > 0) {
    const refundRequest = firstPage.data[0];
    TestValidator.predicate(
      "refund request has id",
      refundRequest.id !== null && refundRequest.id !== undefined,
    );
    TestValidator.equals(
      "refund request status",
      refundRequest.status,
      "pending",
    );
    TestValidator.predicate(
      "refund request has reason",
      refundRequest.reason !== null && refundRequest.reason !== undefined,
    );
    // 9. Verify order item details are included
    TestValidator.predicate(
      "order item exists",
      refundRequest.orderItem !== null && refundRequest.orderItem !== undefined,
    );
    TestValidator.predicate(
      "order item has id",
      refundRequest.orderItem.id !== null &&
        refundRequest.orderItem.id !== undefined,
    );
    TestValidator.predicate(
      "order item has quantity",
      refundRequest.orderItem.quantity !== null &&
        refundRequest.orderItem.quantity !== undefined,
    );
    TestValidator.predicate(
      "order item has unit_price",
      refundRequest.orderItem.unit_price !== null &&
        refundRequest.orderItem.unit_price !== undefined,
    );
    // 10. Verify seller information is included
    TestValidator.predicate(
      "seller exists",
      refundRequest.seller !== null && refundRequest.seller !== undefined,
    );
    TestValidator.predicate(
      "seller has id",
      refundRequest.seller.id !== null && refundRequest.seller.id !== undefined,
    );
    TestValidator.predicate(
      "seller has email",
      refundRequest.seller.email !== null &&
        refundRequest.seller.email !== undefined,
    );
    TestValidator.predicate(
      "seller has profile",
      refundRequest.seller.profile !== null &&
        refundRequest.seller.profile !== undefined,
    );
    // 11. Verify order item contains nested order summary
    TestValidator.predicate(
      "order exists in orderItem",
      refundRequest.orderItem.order !== null &&
        refundRequest.orderItem.order !== undefined,
    );
    TestValidator.predicate(
      "order has id",
      refundRequest.orderItem.order.id !== null &&
        refundRequest.orderItem.order.id !== undefined,
    );
    // 12. Verify refund request snapshots array exists
    TestValidator.predicate(
      "refund request snapshots exists",
      refundRequest.refundRequestSnapshots !== null &&
        refundRequest.refundRequestSnapshots !== undefined,
    );
  }
}
