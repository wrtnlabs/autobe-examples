import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_seller_suspensions_suspend } from "../../../generate/generate_random_ecommerce_mall_admin_seller_suspensions_suspend";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_product_creation_rejected_suspended_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registers and logs in
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Seller registers (pending approval status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
  } satisfies IEcommerceMallSeller.IJoin;
  const seller = await authorize_seller_join(sellerConnection, {
    body: sellerJoinInput,
  });
  typia.assert(seller);
  // 3. Seller logs in (should succeed after approval)
  // Seller login uses the same credentials as join
  const sellerLoginInput = {
    email: sellerJoinInput.email,
    password: sellerJoinInput.password,
  } satisfies IEcommerceMallSeller.ILogin;
  const sellerLoggedIn = await authorize_seller_login(sellerConnection, {
    body: sellerLoginInput,
  });
  typia.assert(sellerLoggedIn);
  // 4. Admin suspends seller
  const suspension =
    await generate_random_ecommerce_mall_admin_seller_suspensions_suspend(
      adminConnection,
      {
        body: {
          seller_id: seller.id,
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  // 5. Suspended seller attempts to create product (should fail)
  await TestValidator.error(
    "suspended seller cannot create product",
    async () => {
      await api.functional.ecommerceMall.seller.products.create(
        sellerConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.content({ paragraphs: 2 }),
            base_price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
            category_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IEcommerceMallProduct.ICreate,
        },
      );
    },
  );
}
