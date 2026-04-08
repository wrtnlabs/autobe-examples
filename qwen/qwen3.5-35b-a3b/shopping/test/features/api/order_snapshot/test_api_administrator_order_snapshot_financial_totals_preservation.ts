import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_addresses_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test that order snapshots preserve financial totals at the exact moment of purchase,
 * regardless of subsequent product price changes.
 *
 * Validates that order snapshots serve as immutable financial records that preserve
 * the original pricing at checkout time. After creating an order and retrieving the
 * snapshot, the product price is updated. The test verifies that the snapshot still
 * contains the original financial totals, demonstrating the snapshot's role as an
 * authoritative record for refunds, disputes, and tax reporting.
 *
 * 1. Administrator and customer accounts are registered and authenticated
 * 2. Seller account is registered and verified as approved
 * 3. Customer creates shipping address for order placement
 * 4. Seller creates product with initial base price
 * 5. Customer places order for product variant, capturing original financial totals
 * 6. Order snapshots are retrieved to obtain snapshot ID
 * 7. Product price is updated to a different value
 * 8. Snapshot is retrieved and validated to confirm it preserves original totals
 *
 * Business rules tested:
 * - Prices are frozen at order creation time
 * - Snapshots are immutable and cannot be modified
 * - Snapshot financial data reflects historical state, not current pricing
 * - Financial accuracy is maintained for customer support and accounting purposes
 */
export async function test_api_administrator_order_snapshot_financial_totals_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: "Administrator",
      email: "admin@ecommerce.test",
      password: "1234",
    },
  });
  typia.assert(adminAuth);
  // 2. Register and authenticate customer
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: "customer@ecommerce.test",
      password: "1234",
      display_name: "Test Customer",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(memberAuth);
  // 3. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@ecommerce.test",
      password: "1234",
      display_name: "Test Seller",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(sellerAuth);
  // Verify seller is approved (otherwise product creation will fail)
  TestValidator.equals(
    "seller should be approved to create products",
    sellerAuth.approval_status,
    "approved",
  );
  // 4. Create customer shipping address
  const address =
    await api.functional.ecommerceMall.member.customer.addresses.create(
      memberConnection,
      {
        body: {
          recipient_name: "Test Recipient",
          phone: "01012345678",
          street: "123 Test Street",
          city: "Seoul",
          state: "Seoul",
          postal_code: "06292",
          country: "South Korea",
          is_default: true,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address);
  // 5. Create product with seller (using placeholder category ID)
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "Test product description for snapshot testing",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 100,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Verify product has variants (backend should auto-create default variant)
  if (product.variants.length === 0) {
    throw new Error("Product must have at least one variant");
  }
  // 6. Create order for product variant
  const order = await api.functional.ecommerceMall.member.orders.create(
    memberConnection,
    {
      body: {
        shipping_address_id: address.id,
        order_items: [
          {
            product_variant_id: product.variants[0].id,
            quantity: 1,
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Capture original financial totals at order creation
  if (order.items.length === 0) {
    throw new Error("Order must have at least one item");
  }
  const originalUnitPrice = order.items[0].unit_price;
  const originalTotalPrice = order.total_price;
  // 7. Retrieve order snapshots to get snapshot ID
  const snapshotPage =
    await api.functional.ecommerceMall.administrator.orders.snapshots.index(
      adminConnection,
      {
        orderId: order.id,
        body: {},
      },
    );
  typia.assert(snapshotPage);
  // Get first snapshot
  if (snapshotPage.data.length === 0) {
    throw new Error("Order must have at least one snapshot");
  }
  const firstSnapshot = snapshotPage.data[0];
  // 8. Update product price to $150
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          base_price: 150,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // Verify product price was updated
  if (updatedProduct.variants.length === 0) {
    throw new Error("Updated product must have at least one variant");
  }
  const newVariantPrice = updatedProduct.variants[0].price;
  // 9. Retrieve specific snapshot
  const snapshot =
    await api.functional.ecommerceMall.administrator.orders.snapshots.at(
      adminConnection,
      {
        orderId: order.id,
        snapshotId: firstSnapshot.id,
      },
    );
  typia.assert(snapshot);
  // 10. Validate snapshot preserves original financial totals
  TestValidator.equals(
    "snapshot subtotal should be original unit price",
    snapshot.subtotal,
    originalUnitPrice,
  );
  TestValidator.equals(
    "snapshot total_amount should be original order total",
    snapshot.total_amount,
    originalTotalPrice,
  );
  TestValidator.equals(
    "snapshot subtotal should NOT reflect updated product price",
    snapshot.subtotal,
    150,
  );
  TestValidator.notEquals(
    "snapshot subtotal should differ from new variant price",
    snapshot.subtotal,
    newVariantPrice,
  );
}
