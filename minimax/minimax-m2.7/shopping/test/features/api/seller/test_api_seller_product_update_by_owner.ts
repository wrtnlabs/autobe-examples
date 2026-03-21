import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
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
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";

export async function test_api_seller_product_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // 2. Create seller account (pending approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {});
  // 3. Admin logs in to approve seller
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: (sellerJoinConnection as any).__password ?? "password",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  // 4. Approve the seller
  await generate_random_ecommerce_mall_admin_seller_approvals_create(
    adminLoginConnection,
    {
      body: {
        sellerId: sellerAuth.id,
        status: "approved",
      } satisfies IEcommerceMallSellerApproval.ICreate,
    },
  );
  // 5. Seller logs in (now approved)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: (sellerJoinConnection as any).__password ?? "password",
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  // 6. Create a product with initial values
  const originalName = "Original Product Name";
  const originalDescription = "This is the original product description.";
  const originalPrice = 9999;
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: originalName,
        description: originalDescription,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: originalPrice,
      },
    },
  );
  typia.assert(product);
  // 7. Update the product with new values via PUT
  const newName = "Updated Product Name";
  const newDescription =
    "This is the updated product description with new information.";
  const newPrice = 14999;
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          name: newName,
          description: newDescription,
          base_price: newPrice,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 8. Validate the product was updated correctly
  TestValidator.equals("product name updated", updatedProduct.name, newName);
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    newDescription,
  );
  TestValidator.equals(
    "product price updated",
    updatedProduct.base_price,
    newPrice,
  );
  TestValidator.equals("product ID unchanged", updatedProduct.id, product.id);
  TestValidator.predicate(
    "product is active (not deleted)",
    updatedProduct.deleted_at === null,
  );
}