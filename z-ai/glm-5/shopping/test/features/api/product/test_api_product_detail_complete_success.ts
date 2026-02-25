import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_customers_me_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_reviews_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_products_images_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_product_detail_complete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Seller setup with approval
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_url: typia.random<string & tags.Format<"url">>(),
    },
  });
  typia.assert(sellerAuth);
  // Approve seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // Create seller connection for authenticated requests
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  // 3. Create category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 4. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
        category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Create multiple variants with different option combinations
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<50000>
          >(),
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Small" },
          ],
          stockQuantity: 10,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: null,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          stockQuantity: 0,
        },
      },
    );
  typia.assert(variant2);
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Minimum<50000> & tags.Maximum<100000>
          >(),
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
          stockQuantity: 5,
        },
      },
    );
  typia.assert(variant3);
  // 6. Add inventory to variant1 to increase stock
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    sellerConnection,
    {
      params: { variantId: variant1.id },
      body: {
        quantity: 20,
        reason: "Additional restock",
      },
    },
  );
  // 7. Upload multiple product images
  const image1 =
    await generate_random_shopping_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          url: "https://example.com/image1.jpg",
          order: 1,
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          url: "https://example.com/image2.jpg",
          order: 2,
        },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_shopping_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          url: "https://example.com/image3.jpg",
          order: 3,
        },
      },
    );
  typia.assert(image3);
  // 8. Fetch product detail
  const productDetail = await api.functional.shoppingMall.products.at(
    connection,
    { productId: product.id },
  );
  typia.assert(productDetail);
  // 9. Validate product basic info
  TestValidator.equals("product id", productDetail.id, product.id);
  TestValidator.equals("product name", productDetail.name, product.name);
  TestValidator.equals(
    "product description",
    productDetail.description,
    product.description,
  );
  TestValidator.equals(
    "product base_price",
    productDetail.base_price,
    product.base_price,
  );
  TestValidator.predicate(
    "product has created_at",
    productDetail.created_at !== null,
  );
  TestValidator.predicate(
    "product has updated_at",
    productDetail.updated_at !== null,
  );
  // 10. Validate images are ordered by order field ascending
  TestValidator.equals("images count", productDetail.images.length, 3);
  TestValidator.predicate("images ordered correctly", () => {
    for (let i = 0; i < productDetail.images.length - 1; i++) {
      if (productDetail.images[i].order > productDetail.images[i + 1].order) {
        return false;
      }
    }
    return true;
  });
  TestValidator.equals("first image order", productDetail.images[0].order, 1);
  TestValidator.equals("second image order", productDetail.images[1].order, 2);
  TestValidator.equals("third image order", productDetail.images[2].order, 3);
  // 11. Validate variants
  TestValidator.equals("variants count", productDetail.variants.length, 3);
  // Verify variant SKU codes exist
  const skuCodes = productDetail.variants.map((v) => v.skuCode);
  TestValidator.predicate(
    "variant1 sku exists",
    skuCodes.includes(variant1.skuCode),
  );
  TestValidator.predicate(
    "variant2 sku exists",
    skuCodes.includes(variant2.skuCode),
  );
  TestValidator.predicate(
    "variant3 sku exists",
    skuCodes.includes(variant3.skuCode),
  );
  // Verify variant options
  const variantWithRedSmall = productDetail.variants.find(
    (v) =>
      v.options.some((o) => o.key === "color" && o.value === "Red") &&
      v.options.some((o) => o.key === "size" && o.value === "Small"),
  );
  TestValidator.predicate(
    "variant with Red/Small options exists",
    variantWithRedSmall !== undefined,
  );
  const variantWithRedLarge = productDetail.variants.find(
    (v) =>
      v.options.some((o) => o.key === "color" && o.value === "Red") &&
      v.options.some((o) => o.key === "size" && o.value === "Large"),
  );
  TestValidator.predicate(
    "variant with Red/Large options exists",
    variantWithRedLarge !== undefined,
  );
  const variantWithBlueMedium = productDetail.variants.find(
    (v) =>
      v.options.some((o) => o.key === "color" && o.value === "Blue") &&
      v.options.some((o) => o.key === "size" && o.value === "Medium"),
  );
  TestValidator.predicate(
    "variant with Blue/Medium options exists",
    variantWithBlueMedium !== undefined,
  );
  // 12. Validate seller info
  TestValidator.equals("seller id", productDetail.seller.id, sellerAuth.id);
  TestValidator.equals(
    "seller shop name",
    productDetail.seller.shopName,
    sellerAuth.shopName,
  );
  TestValidator.equals(
    "seller approval status",
    productDetail.seller.approvalStatus,
    "approved",
  );
  // 13. Validate category info
  TestValidator.equals("category id", productDetail.category?.id, category.id);
  TestValidator.equals(
    "category name",
    productDetail.category?.name,
    category.name,
  );
  // 14. Validate review statistics (should be 0 since no reviews created)
  TestValidator.equals("review count", productDetail.review_count, 0);
}
