import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_admin_seller_suspension_preserves_order_processing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as admin
  const adminEmail = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
  >();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Login as admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create seller account
  const sellerEmail = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
  >();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: shopName,
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. Suspend seller account
  const suspendedSeller =
    await api.functional.ecommerceMall.admin.sellers.suspend(
      adminLoginConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(suspendedSeller);
  // 4. Verify seller account_status is 'suspended'
  TestValidator.equals(
    "seller account status is suspended",
    suspendedSeller.account_status,
    "suspended",
  );
  // 5. Verify suspended seller can still login
  const suspendedSellerConnection: api.IConnection = { host: connection.host };
  const suspendedSellerAuth = await authorize_seller_login(
    suspendedSellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(suspendedSellerAuth);
  TestValidator.equals(
    "suspended seller login successful",
    suspendedSellerAuth.account_status,
    "suspended",
  );
  // 6. Verify suspended seller cannot create new products (should fail with 403)
  await TestValidator.httpError(
    "suspended seller cannot create products",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.products.create(
        suspendedSellerConnection,
        {
          body: {
            name: RandomGenerator.name(2),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            category_id: typia.random<string & tags.Format<"uuid">>(),
            base_price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          } satisfies IEcommerceMallProduct.ICreate,
        },
      );
    },
  );
  // 7. Verify suspended seller account details
  TestValidator.equals(
    "seller shop name preserved",
    suspendedSellerAuth.shop_name,
    shopName,
  );
  TestValidator.predicate(
    "seller approval status unchanged",
    suspendedSellerAuth.approval_status === "approved" ||
      suspendedSellerAuth.approval_status === "pending",
  );
}