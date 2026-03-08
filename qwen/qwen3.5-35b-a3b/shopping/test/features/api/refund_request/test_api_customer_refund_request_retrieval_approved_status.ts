import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_customer_refund_request_retrieval_approved_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. List approved refund requests
  const customerRefundList =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          request_status:
            "approved" satisfies IEcommerceMallRefundRequest.IRequest["request_status"],
          limit: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(customerRefundList);
  // 3. Test requires pre-seeded approved refund data
  if (customerRefundList.data.length === 0) {
    TestValidator.predicate(
      "no approved refunds exist - test requires pre-seeded data",
      false,
    );
    return;
  }
  // 4. Get the approved refund request ID
  const approvedRefundSummary = customerRefundList.data[0];
  const refundRequestId = approvedRefundSummary.id;
  // 5. Retrieve specific approved refund request
  const approvedRefundDetail =
    await api.functional.ecommerceMall.customer.refund_requests.at(
      customerConnection,
      {
        refundRequestId,
      },
    );
  typia.assert(approvedRefundDetail);
  // 6. Validate approved state
  TestValidator.equals(
    "refund request status is approved",
    approvedRefundDetail.request_status,
    "approved",
  );
  // 7. Validate order item status is refunded
  TestValidator.equals(
    "order item status is refunded",
    approvedRefundDetail.order_item.itemStatus,
    "refunded",
  );
  // 8. Validate time_limit is preserved (not null)
  TestValidator.predicate(
    "time_limit field is preserved with submission timestamp",
    approvedRefundDetail.time_limit !== null &&
      approvedRefundDetail.time_limit !== undefined,
  );
  // 9. Validate purchase-time snapshots are preserved
  const productSnapshot = JSON.parse(
    approvedRefundDetail.order_item.productSnapshot,
  );
  const variantSnapshot = JSON.parse(
    approvedRefundDetail.order_item.variantSnapshot,
  );
  const sellerProfileSnapshot = JSON.parse(
    approvedRefundDetail.order_item.sellerProfileSnapshot,
  );
  TestValidator.predicate(
    "product snapshot contains purchase-time data",
    productSnapshot !== null && typeof productSnapshot === "object",
  );
  TestValidator.predicate(
    "variant snapshot contains SKU code and option values",
    variantSnapshot !== null &&
      typeof variantSnapshot === "object" &&
      ("sku" in variantSnapshot || "skuCode" in variantSnapshot),
  );
  TestValidator.predicate(
    "seller profile snapshot contains shop name",
    sellerProfileSnapshot !== null &&
      typeof sellerProfileSnapshot === "object" &&
      ("shopName" in sellerProfileSnapshot || "name" in sellerProfileSnapshot),
  );
  // 10. Validate customer can view all snapshot data
  TestValidator.equals(
    "customer can access product snapshot",
    productSnapshot !== null,
    true,
  );
  TestValidator.equals(
    "customer can access variant snapshot",
    variantSnapshot !== null,
    true,
  );
  TestValidator.equals(
    "customer can access seller profile snapshot",
    sellerProfileSnapshot !== null,
    true,
  );
}
