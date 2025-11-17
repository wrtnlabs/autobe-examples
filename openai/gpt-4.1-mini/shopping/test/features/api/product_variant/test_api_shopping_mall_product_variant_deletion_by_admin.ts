import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

/**
 * Test deleting a product variant SKU by an admin user.
 *
 * This includes:
 *
 * 1. Admin account creation (join) and login for authentication.
 * 2. Seller account creation and login to create the parent shopping mall product.
 * 3. Creation of a product variant SKU associated with the parent product.
 * 4. Admin deletion of the product variant SKU by its SKU code.
 * 5. Verification that deletion succeeds without errors.
 *
 * This ensures authorization boundaries are respected and product variants can
 * be managed securely by admins.
 */
export async function test_api_shopping_mall_product_variant_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass1234!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "http://localhost/admin/join",
        referrer: "http://localhost",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "http://localhost/admin/login",
      referrer: "http://localhost",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Seller joins
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPass1234!";
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 4. Seller login
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "http://localhost/seller/login",
      referrer: "http://localhost",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 5. Create product for seller
  const productCode = `PRD-${RandomGenerator.alphaNumeric(10)}`;
  const productRequestBody = {
    code: productCode,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(),
    category_code: typia.random<string>(),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: productRequestBody,
      },
    );
  typia.assert(product);
  TestValidator.equals("product code matches", product.code, productCode);

  // 6. Create product variant SKU under the product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const variantRequestBody = {
    shopping_mall_product_id: product.id,
    sku_code: skuCode,
    color: RandomGenerator.name(),
    size: RandomGenerator.pick(["XS", "S", "M", "L", "XL"] as const),
    option: null,
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
    >(),
    status: "active",
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.shoppingMallProducts.shoppingMallProductVariants.create(
      connection,
      {
        productCode: product.code,
        body: variantRequestBody,
      },
    );
  typia.assert(variant);
  TestValidator.equals("variant SKU code matches", variant.sku_code, skuCode);

  // 7. Switch back to admin for deletion operation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "http://localhost/admin/login",
      referrer: "http://localhost",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 8. Delete the product variant SKU by SKU code
  await api.functional.shoppingMall.admin.shoppingMallProducts.shoppingMallProductVariants.erase(
    connection,
    {
      productCode: product.code,
      skuCode: skuCode,
    },
  );
}
