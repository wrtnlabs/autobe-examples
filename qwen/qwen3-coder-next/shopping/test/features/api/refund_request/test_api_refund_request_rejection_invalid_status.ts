import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
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
import { generate_random_shopping_mall_customer_order_items_refund_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_request_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order_refund_request } from "../../../prepare/prepare_random_shopping_mall_order_refund_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_refund_request_rejection_invalid_status(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MaxLength<255>>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: null,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Create another seller connection for product creation
  const productSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(productSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Get a random category for product
  const categories = [
    "electronics",
    "fashion",
    "home",
    "sports",
    "books",
  ] as const;
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Create a product with variant for testing
  const product = await api.functional.shoppingMall.seller.products.create(
    productSellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        images: [
          {
            image_url: typia.random<string & tags.Format<"uri">>(),
            sort_order: 0,
          },
        ],
        variants: [
          {
            sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
            option_values: [
              {
                option_name: "color",
                option_value: RandomGenerator.pick(["red", "blue", "green"]),
              },
            ],
            price_override: null,
            stock_quantity: 10,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Customer creates an order with the product
  // Since we don't have direct order creation API, we'll simulate the order item creation
  const variant = product.variants[0];
  const orderItem = {
    id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
    unit_price: variant.priceOverride ?? product.base_price,
    total_price: (variant.priceOverride ?? product.base_price) * 1,
    item_status: "delivered" as const,
    original_product_name: product.name,
    original_variant_options: JSON.stringify(variant.optionValues),
    created_at: new Date().toISOString(),
    productSnapshot: {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      category: {
        id: categoryId,
        name: "Electronics",
        description: null,
        parent: null,
        subcategory_count: 0,
      },
      product: {
        id: product.id,
        name: product.name,
        base_price: product.base_price,
        is_deleted: product.is_deleted,
        seller: product.seller,
        category: product.category,
        average_rating: 0,
      },
    },
    variantSnapshot: {
      id: typia.random<string & tags.Format<"uuid">>(),
      product_snapshot_id: typia.random<string & tags.Format<"uuid">>(),
      sku_code: variant.skuCode,
      variant_price_override: variant.priceOverride ?? null,
      stock_quantity: variant.stockQuantity,
      is_in_stock: true,
    },
    sellerProfileSnapshot: {
      id: typia.random<string & tags.Format<"uuid">>(),
      shop_name: productSellerConnection.headers?.["Authorization"]
        ? (productSellerConnection.headers?.["Authorization"] as string)
        : "Test Shop",
      logo_image_url: null,
      approval_status: "approved",
    },
  } satisfies IShoppingMallOrderItem.ISummary;
  // Create a refund request for the order item
  const refundRequest =
    await api.functional.shoppingMall.customer.order_items.refund_request.create(
      customerConnection,
      {
        itemId: orderItem.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallOrderRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request created with pending status",
    refundRequest.status,
    "pending",
  );
  // Seller approves the refund request first
  const approvedRequest =
    await api.functional.shoppingMall.seller.refund_requests.approve.approveRefund(
      sellerConnection,
      {
        requestId: refundRequest.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "refund request approved",
    approvedRequest.status,
    "approved",
  );
  // Now try to reject the already-approved refund request - this should fail
  await TestValidator.error(
    "reject already approved refund request should fail",
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.reject(
        sellerConnection,
        {
          requestId: approvedRequest.id,
          body: {
            reason: "Trying to reject already approved request",
          } satisfies IShoppingMallOrderRefundRequest.IReject,
        },
      );
    },
  );
  // Also verify rejection fails with valid rejection reason
  await TestValidator.error(
    "reject already approved refund request with reason",
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.reject(
        sellerConnection,
        {
          requestId: approvedRequest.id,
          body: {
            reason: "Item was as described, no issue",
          } satisfies IShoppingMallOrderRefundRequest.IReject,
        },
      );
    },
  );
}