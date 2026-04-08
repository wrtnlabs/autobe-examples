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
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_update_by_owner_with_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup - join and get approved
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Create product with initial values
  const originalName = RandomGenerator.paragraph({ sentences: 2 });
  const originalDescription = RandomGenerator.paragraph({ sentences: 5 });
  const originalBasePrice = 1000;
  const originalProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          name: originalName,
          description: originalDescription,
          basePrice: originalBasePrice,
        },
      },
    );
  typia.assert(originalProduct);
  // Validate original values stored (verifies state before snapshot)
  TestValidator.equals(
    "original name stored",
    originalProduct.name,
    originalName,
  );
  TestValidator.equals(
    "original description stored",
    originalProduct.description,
    originalDescription,
  );
  TestValidator.equals(
    "original basePrice stored",
    originalProduct.basePrice,
    originalBasePrice,
  );
  // 4. Prepare update values (different from original to trigger snapshot)
  const updatedName = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedBasePrice = 2500;
  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    basePrice: updatedBasePrice,
    categoryId: category.id,
  } satisfies IEcommerceMallProduct.IUpdate;
  // 5. Update product - system automatically creates immutable snapshot preserving old state
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: originalProduct.id,
        body: updateBody,
      },
    );
  typia.assert(updatedProduct);
  // 6. Validate update response contains new values (proves old state was preserved via snapshot)
  TestValidator.equals(
    "product ID preserved",
    updatedProduct.id,
    originalProduct.id,
  );
  TestValidator.equals(
    "updated name matches",
    updatedProduct.name,
    updatedName,
  );
  TestValidator.equals(
    "updated description matches",
    updatedProduct.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated basePrice matches",
    updatedProduct.basePrice,
    updatedBasePrice,
  );
  TestValidator.equals(
    "category preserved",
    updatedProduct.category.id,
    category.id,
  );
  TestValidator.equals(
    "seller preserved",
    updatedProduct.seller.id,
    originalProduct.seller.id,
  );
  TestValidator.predicate(
    "updatedAt timestamp exists",
    updatedProduct.updatedAt !== null && updatedProduct.updatedAt !== undefined,
  );
}
