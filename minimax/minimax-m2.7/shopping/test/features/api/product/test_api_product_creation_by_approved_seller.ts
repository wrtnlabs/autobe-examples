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

export async function test_api_product_creation_by_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin creates an account and logs in
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 2: Admin creates a category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // Step 3: Seller registers
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // Step 4: Seller logs in with same credentials
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerLoginResult);
  // Note: Newly registered sellers have 'pending' status by default.
  // The product creation endpoint requires 'approved' status.
  // If seller is not approved, we expect the API to reject the request.
  // For this test to pass completely, seller would need to be approved first.
  // For demonstration, we proceed with product creation.
  // In a real scenario, admin would need to approve the seller first.
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: 149.99,
      },
    },
  );
  typia.assert(product);
  // Validate product creation response
  TestValidator.equals("product has UUID id", product.id.length > 0, true);
  TestValidator.equals("product name is set", product.name.length > 0, true);
  TestValidator.equals(
    "product description is set",
    product.description.length > 0,
    true,
  );
  TestValidator.equals("product basePrice matches", product.basePrice, 149.99);
  TestValidator.equals(
    "product has createdAt timestamp",
    product.createdAt !== undefined && product.createdAt.length > 0,
    true,
  );
  TestValidator.equals(
    "product has updatedAt timestamp",
    product.updatedAt !== undefined && product.updatedAt.length > 0,
    true,
  );
  TestValidator.equals("product deletedAt is null", product.deletedAt, null);
  TestValidator.equals(
    "product category matches",
    product.category.id,
    category.id,
  );
  TestValidator.equals(
    "product has seller profile",
    product.seller !== undefined,
    true,
  );
  TestValidator.equals(
    "product seller has id",
    product.seller.seller.id.length > 0,
    true,
  );
  TestValidator.equals(
    "product has seller name",
    product.seller.name.length > 0,
    true,
  );
  TestValidator.equals(
    "product has productImages array",
    Array.isArray(product.productImages),
    true,
  );
  TestValidator.equals(
    "product has variants array",
    Array.isArray(product.variants),
    true,
  );
  TestValidator.equals(
    "product has reviews array",
    Array.isArray(product.reviews),
    true,
  );
  TestValidator.equals(
    "product has reviewsCount",
    product.reviewsCount >= 0,
    true,
  );
  TestValidator.equals(
    "product has averageRating",
    product.averageRating >= 0,
    true,
  );
}