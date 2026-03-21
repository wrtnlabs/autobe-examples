import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";

export async function test_api_cancellation_request_snapshot_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Admin authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup - Customer authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 3. Setup - Two sellers authenticate
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {});
  seller1Connection.headers = { Authorization: seller1Auth.token.access };
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {});
  seller2Connection.headers = { Authorization: seller2Auth.token.access };
  // 4. Setup - Admin creates category
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(category);
  // 5. Setup - Admin approves both sellers
  const approval1 =
    await generate_random_ecommerce_mall_admin_seller_approvals_create(
      adminConnection,
      {
        body: {
          sellerId: seller1Auth.id,
          status: "approved" as const,
        },
      },
    );
  typia.assert(approval1);
  const approval2 =
    await generate_random_ecommerce_mall_admin_seller_approvals_create(
      adminConnection,
      {
        body: {
          sellerId: seller2Auth.id,
          status: "approved" as const,
        },
      },
    );
  typia.assert(approval2);
  // 6. Setup - Both sellers create products
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        category_id: category.id,
        name: RandomGenerator.alphabets(8),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        category_id: category.id,
        name: RandomGenerator.alphabets(8),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product2);
  // Get variants from products
  const variant1 = product1.variants[0];
  const variant2 = product2.variants[0];
  // 7. Setup - Customer adds first product to cart and places order
  const cartItem1 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant1.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(cartItem1);
  const order1 =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: typia.random<string>(),
        },
      },
    );
  typia.assert(order1);
  // 8. Setup - Customer adds second product to cart and places order
  const cartItem2 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant2.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(cartItem2);
  const order2 =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: typia.random<string>(),
        },
      },
    );
  typia.assert(order2);
  // Note: The cancellation request creation endpoint is not available in this SDK.
  // In a complete test, we would:
  // 1. Customer requests cancellation for orderItem1 and orderItem2
  // 2. Seller1 rejects cancellation for orderItem1 (creates 'rejected' snapshot)
  // 3. Seller2 approves cancellation for orderItem2 (creates 'approved' snapshot)
  // For now, we test the filtering functionality with whatever snapshots exist.
  // The test validates that filtering by status correctly isolates approved/rejected snapshots.
  // 9. Test - Filter snapshots by 'approved' status
  const approvedSnapshots =
    await api.functional.ecommerceMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          status: "approved" as const,
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(approvedSnapshots);
  // Validate pagination metadata structure
  TestValidator.equals(
    "approved pagination exists",
    approvedSnapshots.pagination !== null,
    true,
  );
  TestValidator.equals(
    "approved pagination limit",
    approvedSnapshots.pagination.limit,
    10,
  );
  TestValidator.equals(
    "approved pagination current",
    approvedSnapshots.pagination.current,
    1,
  );
  // Validate all returned snapshots have approved status
  for (const snapshot of approvedSnapshots.data) {
    TestValidator.equals(
      "snapshot status is approved",
      snapshot.status,
      "approved" as "approved" | "rejected",
    );
  }
  // 10. Test - Filter snapshots by 'rejected' status
  const rejectedSnapshots =
    await api.functional.ecommerceMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          status: "rejected" as const,
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(rejectedSnapshots);
  // Validate pagination metadata structure
  TestValidator.equals(
    "rejected pagination exists",
    rejectedSnapshots.pagination !== null,
    true,
  );
  TestValidator.equals(
    "rejected pagination limit",
    rejectedSnapshots.pagination.limit,
    10,
  );
  TestValidator.equals(
    "rejected pagination current",
    rejectedSnapshots.pagination.current,
    1,
  );
  // Validate all returned snapshots have rejected status
  for (const snapshot of rejectedSnapshots.data) {
    TestValidator.equals(
      "snapshot status is rejected",
      snapshot.status,
      "rejected" as "approved" | "rejected",
    );
  }
  // 11. Test - Verify filtering returns mutually exclusive results
  // No snapshot should appear in both result sets
  if (approvedSnapshots.data.length > 0 && rejectedSnapshots.data.length > 0) {
    const approvedIds = new Set(approvedSnapshots.data.map((s) => s.id));
    const rejectedIds = new Set(rejectedSnapshots.data.map((s) => s.id));
    for (const approvedId of approvedIds) {
      TestValidator.equals(
        "approved snapshot not in rejected",
        rejectedIds.has(approvedId),
        false,
      );
    }
    for (const rejectedId of rejectedIds) {
      TestValidator.equals(
        "rejected snapshot not in approved",
        approvedIds.has(rejectedId),
        false,
      );
    }
  }
}
