import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_product_hard_deletion_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connections for each actor
  const superAdminConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 2: Super admin joins
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: superAdminPassword,
      },
    });
  // Step 3: Admin joins
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: adminPassword,
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      },
    },
  );
  // Step 4: Seller joins
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: sellerPassword,
      },
    },
  );
  // Step 5: Admin logs in to have privileges to create categories
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: adminPassword,
    },
  });
  // Step 6: Seller logs in to have privileges to create products
  await authorize_seller_login(sellerConnection, {
    body: {
      email: seller.email,
      password: sellerPassword,
    },
  });
  // Step 7: Admin creates a category
  const category: IShoppingMallSection =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  // Step 8: Seller creates a product
  const productRaw: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.categoryId,
        },
      },
    );
  // Use typia.assert to overcome empty DTO and use actual API response structure with 'id' property
  const product = typia.assert<
    IShoppingMallProduct & {
      id: string;
    }
  >(productRaw);
  // Step 9: Super admin logs in to delete product
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdmin.email,
      password: superAdminPassword,
    },
  });
  // Step 10: Super admin hard deletes the product
  await api.functional.shoppingMall.admin.admins.products.erase(
    superAdminConnection,
    {
      productId: product.id,
    },
  );
  // Step 11: Verify admin cannot delete the same product (now deleted)
  await TestValidator.error(
    "admin cannot delete product after super admin deletion",
    async () => {
      await api.functional.shoppingMall.admin.admins.products.erase(
        adminConnection,
        {
          productId: product.id,
        },
      );
    },
  );
  // Step 12: Verify seller cannot delete the product
  await TestValidator.error("seller cannot delete product", async () => {
    await api.functional.shoppingMall.admin.admins.products.erase(
      sellerConnection,
      {
        productId: product.id,
      },
    );
  });
  // Step 13: Verify guest user cannot delete the product
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("guest cannot delete product", async () => {
    await api.functional.shoppingMall.admin.admins.products.erase(
      guestConnection,
      {
        productId: product.id,
      },
    );
  });
}
