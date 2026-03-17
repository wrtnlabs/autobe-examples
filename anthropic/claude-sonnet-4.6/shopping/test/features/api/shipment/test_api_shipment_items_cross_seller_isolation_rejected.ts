import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import type { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_orders_shipments_items_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_item } from "../../../prepare/prepare_random_shopping_mall_shipment_item";

export async function test_api_shipment_items_cross_seller_isolation_rejected(
  connection: api.IConnection,
): Promise<void> {
  // ── 1. Admin setup ──────────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Admin creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.alphabets(8), parent_id: null } },
  );
  typia.assert(category);
  // ── 2. Seller A setup ────────────────────────────────────────────────────
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = typia.random<string & tags.Format<"password">>();
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Seller A submits approval request
  const sellerAApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerAConnection,
      { body: {} },
    );
  typia.assert(sellerAApproval);
  // Admin approves Seller A
  await api.functional.shoppingMall.admin.sellerApprovals.update(
    adminConnection,
    {
      approvalId: sellerAApproval.id,
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IShoppingMallSellerApproval.IUpdate,
    },
  );
  // Seller A re-login after approval to get fresh authorized session
  await authorize_seller_login(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Seller A creates a product
  const sellerAProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerAConnection,
      { body: { categoryId: category.id } },
    );
  typia.assert(sellerAProduct);
  // Seller A creates a variant
  const sellerAVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: sellerAProduct.id },
        body: {},
      },
    );
  typia.assert(sellerAVariant);
  // Seller A adds inventory
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerAConnection,
    {
      params: {
        productId: sellerAProduct.id,
        variantId: sellerAVariant.id,
      },
      body: { quantity: 100, note: "Initial stock for seller A" },
    },
  );
  // ── 3. Seller B setup ────────────────────────────────────────────────────
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = typia.random<string & tags.Format<"password">>();
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Seller B submits approval request
  const sellerBApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerBConnection,
      { body: {} },
    );
  typia.assert(sellerBApproval);
  // Admin approves Seller B
  await api.functional.shoppingMall.admin.sellerApprovals.update(
    adminConnection,
    {
      approvalId: sellerBApproval.id,
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IShoppingMallSellerApproval.IUpdate,
    },
  );
  // Seller B re-login after approval
  await authorize_seller_login(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Seller B creates a product
  const sellerBProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerBConnection,
      { body: { categoryId: category.id } },
    );
  typia.assert(sellerBProduct);
  // Seller B creates a variant
  const sellerBVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: sellerBProduct.id },
        body: {},
      },
    );
  typia.assert(sellerBVariant);
  // Seller B adds inventory
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerBConnection,
    {
      params: {
        productId: sellerBProduct.id,
        variantId: sellerBVariant.id,
      },
      body: { quantity: 100, note: "Initial stock for seller B" },
    },
  );
  // ── 4. Customer places a multi-seller order ──────────────────────────────
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            product_variant_id: sellerAVariant.id,
            quantity: 1,
          },
          {
            product_variant_id: sellerBVariant.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // Identify each seller's order item by matching product variant ID
  const sellerAOrderItem = order.items.find(
    (item) => item.productVariant.id === sellerAVariant.id,
  );
  const sellerBOrderItem = order.items.find(
    (item) => item.productVariant.id === sellerBVariant.id,
  );
  TestValidator.predicate(
    "seller A order item should exist in the order",
    sellerAOrderItem !== undefined,
  );
  TestValidator.predicate(
    "seller B order item should exist in the order",
    sellerBOrderItem !== undefined,
  );
  // ── 5. Seller A creates a shipment for their own paid order item ─────────
  const sellerAShipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerAConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: [sellerAOrderItem!.id],
        },
      },
    );
  typia.assert(sellerAShipment);
  // ── 6. Target Call: Seller A tries to assign Seller B's item ─────────────
  // This MUST be rejected — seller isolation prevents cross-seller item assignment
  await TestValidator.error(
    "seller A cannot assign seller B's order item to seller A's shipment",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.items.create(
        sellerAConnection,
        {
          orderId: order.id,
          shipmentId: sellerAShipment.id,
          body: {
            orderItemIds: [sellerBOrderItem!.id],
          } satisfies IShoppingMallShipmentItem.ICreate,
        },
      );
    },
  );
}
