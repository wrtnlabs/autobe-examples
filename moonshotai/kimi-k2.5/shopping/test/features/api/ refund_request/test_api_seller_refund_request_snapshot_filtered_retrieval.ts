import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
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
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_seller_refund_request_snapshot_filtered_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer to create refund request
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create refund request through customer flow
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  // 3. Authenticate as seller to access refund request snapshots
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Get refund request details for the seller
  const refundRequestDetails =
    await api.functional.ecommerceMall.seller.refund_requests.at(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(refundRequestDetails);
  // 5. Query snapshots with date range filter
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const snapshotsWithDateFilter =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: null,
          reason: null,
          responseReason: null,
          createdAtFrom: oneDayAgo.toISOString(),
          createdAtTo: oneDayLater.toISOString(),
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(snapshotsWithDateFilter);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotsWithDateFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotsWithDateFilter.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    snapshotsWithDateFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    snapshotsWithDateFilter.pagination.pages >= 0,
  );
  // 7. Query snapshots with status filter (pending)
  const snapshotsWithPendingStatus =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "pending",
          reason: null,
          responseReason: null,
          createdAtFrom: null,
          createdAtTo: null,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshotsWithPendingStatus);
  // 8. Validate status filter results - only check if data exists
  if (snapshotsWithPendingStatus.data.length > 0) {
    snapshotsWithPendingStatus.data.forEach((snapshot) => {
      TestValidator.equals(
        "snapshot status is pending",
        snapshot.status,
        "pending",
      );
    });
  }
  // 9. Query snapshots with pagination parameters
  const snapshotsWithPagination =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: null,
          reason: null,
          responseReason: null,
          createdAtFrom: null,
          createdAtTo: null,
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(snapshotsWithPagination);
  // 10. Validate pagination limits
  TestValidator.predicate(
    "data length within limit",
    snapshotsWithPagination.data.length <=
      snapshotsWithPagination.pagination.limit,
  );
  // 11. Validate refund request ID association in snapshots
  if (snapshotsWithPagination.data.length > 0) {
    snapshotsWithPagination.data.forEach((snapshot) => {
      TestValidator.equals(
        "snapshot belongs to correct refund request",
        snapshot.refundRequestId,
        refundRequest.id,
      );
    });
  }
}
