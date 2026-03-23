import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductDeletion";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_admin_product_deletions_create } from "../../../generate/generate_random_ecommerce_mall_admin_product_deletions_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_deletion } from "../../../prepare/prepare_random_ecommerce_mall_product_deletion";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_deletion_request_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup: create seller account and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(3),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Login as seller
  const sellerLogin = await api.functional.ecommerceMall.auth.seller.login(
    sellerConnection,
    {
      body: {
        email: seller.email,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerLogin);
  // 2. Seller creates a product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_available: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Admin setup: register and login
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.ecommerceMall.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Login as admin
  const adminLogin = await api.functional.ecommerceMall.auth.admin.login(
    adminConnection,
    {
      body: {
        email: (admin as any).email,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  typia.assert(adminLogin);
  // 4. Create product deletion request
  const deletionRequest =
    await api.functional.ecommerceMall.admin.product_deletions.create(
      adminConnection,
      {
        body: {
          product_id: product.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallProductDeletion.ICreate,
      },
    );
  typia.assert(deletionRequest);
  // 5. Validate deletion request
  TestValidator.equals(
    "product_id matches",
    deletionRequest.product_id,
    product.id,
  );
  TestValidator.equals("admin_id matches", deletionRequest.admin_id, admin.id);
  TestValidator.equals("status is pending", deletionRequest.status, "pending");
  TestValidator.predicate(
    "reason is provided",
    deletionRequest.reason.length > 0,
  );
  TestValidator.notEquals(
    "product relationship exists",
    deletionRequest.product,
    null,
  );
  TestValidator.notEquals(
    "admin relationship exists",
    deletionRequest.admin,
    null,
  );
  typia.assert(deletionRequest.product);
  typia.assert(deletionRequest.admin);
}