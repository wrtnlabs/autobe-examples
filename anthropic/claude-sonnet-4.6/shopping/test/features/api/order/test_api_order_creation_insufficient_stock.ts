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

export async function test_api_order_creation_insufficient_stock(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Admin: register & login ───────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ─── 2. Admin: create a product category ──────────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.alphabets(8) } },
  );
  typia.assert(category);
  // ─── 3. Seller: register ──────────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // ─── 4. Seller: submit approval request ───────────────────────────────
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // ─── 5. Admin: approve the seller ─────────────────────────────────────
  const approvedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedApproval);
  // ─── 6. Seller: create a product ──────────────────────────────────────
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { categoryId: category.id } },
  );
  typia.assert(product);
  // ─── 7. Seller: add a variant to the product ──────────────────────────
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(variant);
  // ─── 8. Seller: create inventory record with 3 units ──────────────────
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: 3 as number & tags.Type<"int32">,
          note: "Initial stock for boundary testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  TestValidator.equals(
    "inventory quantity is 3",
    inventoryRecord.quantity,
    3 as number & tags.Type<"int32">,
  );
  // ─── 9. Customer: register & login ────────────────────────────────────
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // ─── Shared shipping address fields ───────────────────────────────────
  const recipientName = RandomGenerator.name() as string & tags.MinLength<1>;
  const recipientPhone = RandomGenerator.mobile() as string & tags.MinLength<1>;
  const addressLine1 = RandomGenerator.paragraph({ sentences: 1 }) as string &
    tags.MinLength<1>;
  const city = RandomGenerator.alphabets(6) as string & tags.MinLength<1>;
  const postalCode = "12345" as string & tags.MinLength<1>;
  const country = "KR" as string & tags.MinLength<1>;
  // ─── Test 1: Insufficient stock (quantity = 10, available = 3) ─────────
  await TestValidator.error(
    "order with quantity exceeding stock should be rejected",
    async () => {
      await api.functional.shoppingMall.customer.orders.create(
        customerConnection,
        {
          body: {
            recipient_name: recipientName,
            recipient_phone: recipientPhone,
            shipping_address_line1: addressLine1,
            shipping_address_line2: null,
            shipping_city: city,
            shipping_state: null,
            shipping_postal_code: postalCode,
            shipping_country: country,
            items: [
              {
                product_variant_id: variant.id,
                quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
              },
            ] as IShoppingMallOrder.IItem[] & tags.MinItems<1>,
          } satisfies IShoppingMallOrder.ICreate,
        },
      );
    },
  );
  // ─── Test 2: Exactly matching stock (quantity = 3, available = 3) ──────
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        shipping_address_line1: addressLine1,
        shipping_address_line2: null,
        shipping_city: city,
        shipping_state: null,
        shipping_postal_code: postalCode,
        shipping_country: country,
        items: [
          {
            product_variant_id: variant.id,
            quantity: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
          },
        ] as IShoppingMallOrder.IItem[] & tags.MinItems<1>,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  TestValidator.equals("order status is paid", order.status, "paid");
  TestValidator.predicate("total price is positive", order.total_price > 0);
  // ─── Test 3: Post-exhaustion rejection (quantity = 1, stock = 0) ───────
  await TestValidator.error(
    "order after stock exhaustion should be rejected",
    async () => {
      await api.functional.shoppingMall.customer.orders.create(
        customerConnection,
        {
          body: {
            recipient_name: recipientName,
            recipient_phone: recipientPhone,
            shipping_address_line1: addressLine1,
            shipping_address_line2: null,
            shipping_city: city,
            shipping_state: null,
            shipping_postal_code: postalCode,
            shipping_country: country,
            items: [
              {
                product_variant_id: variant.id,
                quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
              },
            ] as IShoppingMallOrder.IItem[] & tags.MinItems<1>,
          } satisfies IShoppingMallOrder.ICreate,
        },
      );
    },
  );
}
