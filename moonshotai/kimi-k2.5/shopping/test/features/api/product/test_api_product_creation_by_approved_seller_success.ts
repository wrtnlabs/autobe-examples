import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
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

export async function test_api_product_creation_by_approved_seller_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate seller credentials beforehand for reuse
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a product category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Electronics",
        description: null,
        parentId: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Create seller with pending status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuth);
  // 4. Admin approves the seller registration
  // Using seller ID as registration ID (assuming 1:1 relationship in this domain)
  const registrationId = sellerAuth.id;
  const approvedRegistration =
    await api.functional.ecommerceMall.admin.registrations.update(
      adminConnection,
      {
        registrationId,
        body: {
          status: "approved",
          rejectionReason: null,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(approvedRegistration);
  // 5. Authenticate as the approved seller
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 6. Create a product with specific values
  const productInput = {
    name: "Smartphone X",
    description: "Latest flagship smartphone",
    categoryId: category.id,
    basePrice: 999.99,
  } satisfies IEcommerceMallProduct.ICreate;
  const product = await api.functional.ecommerceMall.seller.products.create(
    approvedSellerConnection,
    {
      body: productInput,
    },
  );
  typia.assert(product);
  // 7. Verify business logic (typia.assert already validated types)
  TestValidator.equals(
    "product name matches input",
    product.name,
    productInput.name,
  );
  TestValidator.equals(
    "product description matches input",
    product.description,
    productInput.description,
  );
  TestValidator.equals(
    "product base price matches input",
    product.base_price,
    productInput.basePrice,
  );
  TestValidator.equals(
    "product category ID matches",
    product.category.id,
    category.id,
  );
  TestValidator.equals(
    "product seller ID matches authenticated seller",
    product.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "product images array is empty",
    product.images.length,
    0,
  );
  TestValidator.equals(
    "product variants array is empty",
    product.variants.length,
    0,
  );
}
