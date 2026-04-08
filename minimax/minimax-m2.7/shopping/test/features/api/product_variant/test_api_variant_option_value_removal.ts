import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_variant_option_value_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create new connection with seller token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedSellerConnection.headers = {
    Authorization: sellerAuth.token.access,
  };
  // 4. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    authenticatedSellerConnection,
    {
      body: {
        categoryId: category.id,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Create variant with color, size, and weight options
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      authenticatedSellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10>
          >(),
          optionValues: [
            { key: "color", value: "Green" },
            { key: "size", value: "Large" },
            { key: "weight", value: "2kg" },
          ] satisfies IEcommerceMallProductVariantOptionValue.ICreate[],
        },
      },
    );
  typia.assert(variant);
  // 6. Verify variant has all 3 options before removal
  const optionKeysBefore = variant.optionValues.map((opt) => opt.key);
  TestValidator.equals(
    "variant has color option before removal",
    optionKeysBefore.includes("color"),
    true,
  );
  TestValidator.equals(
    "variant has size option before removal",
    optionKeysBefore.includes("size"),
    true,
  );
  TestValidator.equals(
    "variant has weight option before removal",
    optionKeysBefore.includes("weight"),
    true,
  );
  TestValidator.equals(
    "variant has 3 options before removal",
    variant.optionValues.length,
    3,
  );
  // 7. Remove 'weight' option by setting its value to null
  const updatedOption =
    await api.functional.ecommerceMall.seller.products.variants.option_values.patchByProductidAndVariantid(
      authenticatedSellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          key: "weight",
          value: null as unknown as undefined,
        } as IEcommerceMallProductVariantOptionValue.IUpdate,
      },
    );
  typia.assert(updatedOption);
  // 8. Verify weight option is removed
  TestValidator.equals(
    "removed option key matches",
    updatedOption.key,
    "weight",
  );
  TestValidator.equals(
    "removed option value is null",
    updatedOption.value,
    null,
  );
  TestValidator.predicate(
    "option value is null after removal",
    updatedOption.value === null,
  );
}
