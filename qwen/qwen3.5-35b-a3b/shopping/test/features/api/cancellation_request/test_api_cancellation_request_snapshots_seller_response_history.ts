import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_cancellation_requests_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_cancellation_request_snapshots_seller_response_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(customer);
  // 2. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // 3. Create category for product (admin could create, but for test we'll use random UUID)
  // Note: In real scenario, category would be pre-created by admin
  // Using a random UUID for testing purposes
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create product as seller with variants
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Create two product variants to have items for cancellation requests
  const variant1 = product.variants[0];
  const variant2 = product.variants[1];
  // 5. Generate shipping address ID (no address creation API available)
  const addressId = typia.random<string & tags.Format<"uuid">>();
  // 6. Create order with items from seller (multiple variants)
  const order = await api.functional.ecommerceMall.member.orders.create(
    customerConnection,
    {
      body: {
        shipping_address_id: addressId,
        order_items: [
          {
            product_variant_id: variant1.id,
            quantity: 1,
          },
          {
            product_variant_id: variant2.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 7. Create first cancellation request for item 1
  const cancellationRequest1 =
    await api.functional.ecommerceMall.member.cancellation_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: order.items[0].id,
          reason: "Changed my mind about first item",
        },
      },
    );
  typia.assert(cancellationRequest1);
  // 8. Create second cancellation request for item 2
  const cancellationRequest2 =
    await api.functional.ecommerceMall.member.cancellation_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: order.items[1].id,
          reason: "Changed my mind about second item",
        },
      },
    );
  typia.assert(cancellationRequest2);
  // 9. Seller approves first cancellation request
  const approvedRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        id: cancellationRequest1.id,
        body: { status: "approved" },
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "first request approved status",
    approvedRequest.status,
    "approved",
  );
  // 10. Seller rejects second cancellation request with reason
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        id: cancellationRequest2.id,
        body: {
          status: "rejected",
          seller_rejection_reason:
            "Cannot approve this cancellation due to policy violation",
        },
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "second request rejected status",
    rejectedRequest.status,
    "rejected",
  );
  // 11. Query cancellation request snapshots as seller (without status filter to get all)
  const snapshots =
    await api.functional.ecommerceMall.member.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {
          actor_type: "customer",
          limit: 10,
        },
      },
    );
  typia.assert(snapshots);
  // 12. Verify pagination metadata
  TestValidator.equals(
    "snapshots total records",
    snapshots.pagination.records,
    2,
  );
  TestValidator.equals(
    "snapshots current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals("snapshots limit", snapshots.pagination.limit, 10);
  TestValidator.predicate(
    "snapshots pages valid",
    snapshots.pagination.pages >= 1,
  );
  // 13. Verify snapshots data count
  TestValidator.equals("snapshots data count", snapshots.data.length, 2);
  // 14. Find approved snapshot by checking for approved_at
  const approvedSnapshot = snapshots.data.find(
    (s) =>
      s.cancellationRequest.id === cancellationRequest1.id &&
      s.approved_at !== undefined &&
      s.approved_at !== null,
  );
  TestValidator.equals(
    "approved snapshot found in results",
    approvedSnapshot !== undefined,
    true,
  );
  // 15. Validate approved snapshot details
  if (approvedSnapshot) {
    TestValidator.equals(
      "approved snapshot title matches",
      approvedSnapshot.title,
      "Changed my mind about first item",
    );
    TestValidator.equals(
      "approved snapshot actor type",
      approvedSnapshot.actor_type,
      "customer",
    );
    TestValidator.predicate(
      "approved snapshot has approved_at timestamp",
      approvedSnapshot.approved_at !== undefined &&
        approvedSnapshot.approved_at !== null,
    );
    TestValidator.equals(
      "approved snapshot has no rejection reason",
      approvedSnapshot.seller_rejection_reason,
      null,
    );
  }
  // 16. Find rejected snapshot by checking for rejected_at
  const rejectedSnapshot = snapshots.data.find(
    (s) =>
      s.cancellationRequest.id === cancellationRequest2.id &&
      s.rejected_at !== undefined &&
      s.rejected_at !== null,
  );
  TestValidator.equals(
    "rejected snapshot found in results",
    rejectedSnapshot !== undefined,
    true,
  );
  // 17. Validate rejected snapshot details
  if (rejectedSnapshot) {
    TestValidator.equals(
      "rejected snapshot title matches",
      rejectedSnapshot.title,
      "Changed my mind about second item",
    );
    TestValidator.equals(
      "rejected snapshot actor type",
      rejectedSnapshot.actor_type,
      "customer",
    );
    TestValidator.predicate(
      "rejected snapshot has rejected_at timestamp",
      rejectedSnapshot.rejected_at !== undefined &&
        rejectedSnapshot.rejected_at !== null,
    );
    TestValidator.equals(
      "rejected snapshot has rejection reason",
      rejectedSnapshot.seller_rejection_reason,
      "Cannot approve this cancellation due to policy violation",
    );
  }
  // 18. Verify snapshots are immutable - query again and ensure data unchanged
  const snapshotsAgain =
    await api.functional.ecommerceMall.member.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {
          actor_type: "customer",
          limit: 10,
        },
      },
    );
  typia.assert(snapshotsAgain);
  TestValidator.equals(
    "snapshots immutable data count",
    snapshotsAgain.data.length,
    2,
  );
  TestValidator.equals(
    "approved snapshot preserved",
    snapshotsAgain.data.some(
      (s) =>
        s.cancellationRequest.id === cancellationRequest1.id &&
        s.approved_at !== null,
    ),
    true,
  );
  TestValidator.equals(
    "rejected snapshot preserved",
    snapshotsAgain.data.some(
      (s) =>
        s.cancellationRequest.id === cancellationRequest2.id &&
        s.rejected_at !== null,
    ),
    true,
  );
  // 19. Query with response_status filter for rejected only
  const rejectedSnapshots =
    await api.functional.ecommerceMall.member.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {
          actor_type: "customer",
          response_status: "rejected",
          limit: 10,
        },
      },
    );
  typia.assert(rejectedSnapshots);
  TestValidator.equals(
    "rejected only snapshots count",
    rejectedSnapshots.data.length,
    1,
  );
  const rejectionOnlySnapshot = rejectedSnapshots.data[0];
  TestValidator.equals(
    "rejected snapshot reason preserved",
    rejectionOnlySnapshot.seller_rejection_reason,
    "Cannot approve this cancellation due to policy violation",
  );
  // 20. Verify cancellation request snapshots have seller relationship
  if (approvedSnapshot) {
    TestValidator.equals(
      "approved snapshot seller id matches",
      approvedSnapshot.cancellationRequest.seller.id,
      seller.id,
    );
  }
  if (rejectedSnapshot) {
    TestValidator.equals(
      "rejected snapshot seller id matches",
      rejectedSnapshot.cancellationRequest.seller.id,
      seller.id,
    );
  }
}
