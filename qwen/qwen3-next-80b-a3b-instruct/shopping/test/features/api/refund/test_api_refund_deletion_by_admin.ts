import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IProductVariantAttributes } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductVariantAttributes";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerBillingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBillingAddress";
import type { IShoppingMallSellerOnboardingProgress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingProgress";
import type { IShoppingMallSellerPayoutSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutSettings";
import type { IShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceMetrics";
import type { IShoppingMallSellerSocialMediaHandles } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSocialMediaHandles";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_order_refund } from "../../../prepare/prepare_random_shopping_mall_order_refund";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_admin_orders_items_create } from "../../../generate/generate_random_shopping_mall_admin_orders_items_create";
import { generate_random_shopping_mall_admin_orders_refunds_create } from "../../../generate/generate_random_shopping_mall_admin_orders_refunds_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_refund_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href:
      RandomGenerator.alphaNumeric(10) + "." + RandomGenerator.alphaNumeric(3),
    referrer:
      RandomGenerator.alphaNumeric(8) + "." + RandomGenerator.alphaNumeric(3),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // Step 2: Create seller connection and register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    business_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    createdAt: new Date().toISOString(),
  } satisfies IShoppingMallSeller.IJoin;
  await authorize_member_join(sellerConnection, { body: sellerCredentials });
  // Step 3: Create product by seller
  const productData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 8,
    }),
    categoryId: typia.random<string & tags.Format<"uuid">>(),
    price: typia.random<number & tags.Minimum<0.01> & tags.Maximum<100000>>(),
    sku: "SKU-" + RandomGenerator.alphaNumeric(8),
    images: [
      typia.random<string & tags.Format<"uri">>(),
      typia.random<string & tags.Format<"uri">>(),
    ],
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    { body: productData },
  );
  typia.assert(product);
  // Step 4: Create product variant by seller
  const variantData = {
    attributes: "size:large,color:black", // As string per DTO definition
    price: (typia.random<number & tags.Minimum<0.01>>() satisfies number as number),
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: variantData,
      },
    );
  typia.assert(variant);
  // Step 5: Admin creates order item
  const orderItemData = {
    productVariantId: typia.assert<{ id: string }>(variant).id,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >(),
  } satisfies IShoppingMallOrderItem.ICreate;
  const orderCode = "ORD-" + RandomGenerator.alphaNumeric(8);
  const orderItem = await api.functional.shoppingMall.admin.orders.items.create(
    adminConnection,
    {
      orderCode: orderCode,
      body: orderItemData,
    },
  );
  typia.assert(orderItem);
  // Step 6: Admin initiates refund request
  const refundData = {
    orderCode: orderCode,
    reason: "Customer requested refund",
    refund_amount: orderItem.totalPrice,
    refund_type: "full",
    return_items: [orderItem.id],
    return_reason_code: "CUSTOMER_REQUEST",
    return_ship_method: "standard_return",
  } satisfies IShoppingMallOrderRefund.ICreate;
  const refund = await api.functional.shoppingMall.admin.orders.refunds.create(
    adminConnection,
    {
      orderCode: orderCode,
      body: refundData,
    },
  );
  typia.assert(refund);
  // Step 7: Admin deletes the refund record permanently
  await api.functional.shoppingMall.admin.orders.refunds.erase(
    adminConnection,
    {
      orderCode: orderCode,
      refundCode: refund.refund_code,
    },
  );
  // Step 8: Verify refund record is irreversibly deleted by attempting to delete again
  // This should fail with 404 since the refund no longer exists
  await TestValidator.error(
    "deleted refund should not be accessible on second delete",
    async () => {
      await api.functional.shoppingMall.admin.orders.refunds.erase(
        adminConnection,
        {
          orderCode: orderCode,
          refundCode: refund.refund_code,
        },
      );
    },
  );
}