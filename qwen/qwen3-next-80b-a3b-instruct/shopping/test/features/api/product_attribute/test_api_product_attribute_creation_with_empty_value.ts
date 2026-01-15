import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerBillingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBillingAddress";
import type { IShoppingMallSellerOnboardingProgress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingProgress";
import type { IShoppingMallSellerPayoutSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutSettings";
import type { IShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceMetrics";
import type { IShoppingMallSellerSocialMediaHandles } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSocialMediaHandles";
import { prepare_random_shopping_mall_product_attribute } from "../../../prepare/prepare_random_shopping_mall_product_attribute";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { generate_random_shopping_mall_products_attributes_create } from "../../../generate/generate_random_shopping_mall_products_attributes_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_attribute_creation_with_empty_value(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller to create a product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      business_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      createdAt: new Date().toISOString(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Step 2: Create a product using seller connection
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        price: typia.assert<number & tags.Minimum<0.01> & tags.Maximum<100000>>(typia.random<number & tags.Minimum<0.01>>()),
        sku: RandomGenerator.alphaNumeric(8),
        images: [typia.random<string & tags.Format<"uri">>()],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 3: Authenticate as administrator to create product attributes
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 4: Create a product attribute with empty (undefined) value
  // This tests the system's handling of optional attribute values
  // According to IShoppingMallProductAttribute.ICreate, value is (string & tags.MinLength<1> & tags.MaxLength<500>) | undefined
  // We test the case where value is omitted (undefined) rather than null (which is not allowed)
  const attribute =
    await generate_random_shopping_mall_products_attributes_create(
      adminConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          name: "Color",
          // value is omitted to represent undefined per schema - NOT set to null
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(attribute);
  // Step 5: Validate that the attribute has the correct name and undefined value as expected
  TestValidator.equals("attribute name should match", attribute.name, "Color");
  TestValidator.equals(
    "attribute value should be undefined",
    ((attribute as any).value === undefined) ? undefined : null,
    undefined,
  );
}