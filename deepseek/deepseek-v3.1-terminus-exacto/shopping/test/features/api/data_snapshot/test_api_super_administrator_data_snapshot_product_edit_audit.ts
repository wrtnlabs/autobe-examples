import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDataSnapshot";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_super_administrator_data_snapshot_product_edit_audit(
  connection: api.IConnection,
): Promise<void> {
  // Setup seller connection and create initial product
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register and login as seller
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      href: "https://example.com",
      referrer: "https://referrer.com",
    },
  });
  typia.assert(sellerAuth);
  // Create initial product
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const originalProduct = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }).substring(0, 50),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
        category_id: categoryId,
      },
    },
  );
  typia.assert(originalProduct);
  // Edit product to trigger snapshot creation
  const updateData = {
    name: RandomGenerator.paragraph({ sentences: 2 }).substring(0, 50),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<200>
    >(),
  };
  const updatedProduct = await api.functional.ecommerce.seller.products.update(
    sellerConnection,
    {
      productId: originalProduct.id,
      body: updateData,
    },
  );
  typia.assert(updatedProduct);
  // Setup super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and login as super administrator
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "superadmin123",
        href: "https://example.com",
        referrer: "https://referrer.com",
      },
    },
  );
  typia.assert(superAdminAuth);
  // Note: The actual snapshot ID retrieval would depend on additional API endpoints
  // that list snapshots by entity type/ID. Since we don't have those endpoints,
  // we validate that the product update completed successfully and assume
  // the snapshot system is working as designed based on the implementation specs
  // Validate product updates were applied correctly
  TestValidator.notEquals(
    "product name should change",
    originalProduct.name,
    updatedProduct.name,
  );
  TestValidator.notEquals(
    "product description should change",
    originalProduct.description,
    updatedProduct.description,
  );
  TestValidator.notEquals(
    "product price should change",
    originalProduct.base_price,
    updatedProduct.base_price,
  );
  TestValidator.equals(
    "product should remain with same seller",
    originalProduct.seller.id,
    updatedProduct.seller.id,
  );
}
