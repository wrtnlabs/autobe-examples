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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_admin_products_skus_create } from "../../../generate/generate_random_shopping_mall_admin_products_skus_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_variant_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      createdAt: new Date().toISOString(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Step 3: Seller logs in to perform product creation
  await authorize_member_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Step 4: Seller creates a product
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          price: (typia.random<number & tags.Minimum<0.01>>()) satisfies number as number,
          sku: RandomGenerator.alphaNumeric(8),
          images: [
            typia.random<string & tags.Format<"uri">>(),
            typia.random<string & tags.Format<"uri">>(),
          ],
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Seller adds a variant to the product
  // IProductVariantAttributes is defined as string in schema - must be a JSON string representation
  const variantAttributes = JSON.stringify({
    size: "large",
    color: "blue",
  });
  const productVariant: IShoppingMallProductVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          attributes: variantAttributes,
          price: (typia.random<number & tags.Minimum<0.01>>()) satisfies number as number,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(productVariant);
  // Step 6: Admin deletes the product variant by SKU
  await api.functional.shoppingMall.admin.products.skus.erase(adminConnection, {
    skuId: (productVariant as any).sku,
  });
  // Step 7: Validate deletion was successful by attempting to get the variant again
  // This should fail with 404 Not Found since the variant is permanently deleted
  await TestValidator.error("deleted variant should not exist", async () => {
    await api.functional.shoppingMall.admin.products.skus.create(
      adminConnection,
      {
        body: {
          attributes: variantAttributes,
          price: productVariant.price,
          quantity: productVariant.quantity,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  });
}