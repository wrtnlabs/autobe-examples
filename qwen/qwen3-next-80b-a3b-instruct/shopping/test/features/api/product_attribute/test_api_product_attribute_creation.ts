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
export async function test_api_product_attribute_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_member_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      business_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      createdAt: new Date().toISOString(),
    },
  });
  typia.assert(seller);
  // Step 2: Authenticate seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(sellerLoginConnection, {
    body: {
      email: typia.assert((seller as any).email as string),
      password: typia.assert((seller as any).password as string),
    },
  });
  // Step 3: Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        price: typia.random<
          number & tags.Minimum<0.01> & tags.Maximum<100000>
        >(),
        sku: RandomGenerator.alphaNumeric(10),
        images: [typia.random<string & tags.Format<"uri">>()],
      },
    },
  );
  typia.assert(product);
  // Step 4: Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // Step 5: Authenticate admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: typia.assert((admin as any).email as string),
      password: typia.assert((admin as any).password as string),
    },
  });
  // Step 6: Create product attribute
  const attribute =
    await api.functional.shoppingMall.products.attributes.create(
      adminLoginConnection,
      {
        productId: product.id,
        body: {
          name: "Color",
          value: "Red",
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(attribute);
  // Step 7: Validate attribute creation
  TestValidator.equals("attribute name matches", typia.assert(attribute.name as string), "Color");
  TestValidator.equals("attribute value matches", typia.assert((attribute as any).value as string), "Red");
  TestValidator.predicate(
    "attribute has created id",
    typia.assert(attribute.id !== undefined),
  );
}