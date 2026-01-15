import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_retrieval_published(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate a UUID for the category
  const categoryId: string = typia.random<string & tags.Format<"uuid">>();
  // Create a product category with parent_id as null (top-level)
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          status: "active",
          parent_id: null, // Top-level category
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Create and publish a product using the generated UUID as category_id
  const product =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId, // Use the generated UUID category_id
          prices: [prepare_random_community_platform_product_price()],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Verify product is published (is_public = true and status = 'published')
  TestValidator.equals("product is public", product.is_public, true);
  TestValidator.equals(
    "product status is published",
    product.status,
    "published",
  );
  // Create guest connection for unauthenticated access
  const guestConnection: api.IConnection = { host: connection.host };
  // Access the product without authentication
  const retrievedProduct = await api.functional.communityPlatform.products.at(
    guestConnection,
    {
      productCode: product.productCode,
    },
  );
  typia.assert(retrievedProduct);
  // Validate retrieved product data
  TestValidator.equals(
    "productCode matches",
    retrievedProduct.productCode,
    product.productCode,
  );
  TestValidator.equals("name matches", retrievedProduct.name, product.name);
  TestValidator.equals(
    "description matches",
    retrievedProduct.description,
    product.description,
  );
  TestValidator.equals("price matches", retrievedProduct.price, product.price);
  TestValidator.equals(
    "stock_level matches",
    retrievedProduct.stock_level,
    product.stock_level,
  );
  TestValidator.equals(
    "is_in_stock matches",
    retrievedProduct.is_in_stock,
    product.is_in_stock,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedProduct.created_at,
    product.created_at,
  );
  TestValidator.equals(
    "owner_id matches",
    retrievedProduct.owner_id,
    product.owner_id,
  );
  TestValidator.equals(
    "category_id matches",
    retrievedProduct.category_id,
    product.category_id,
  );
  // Since 'images' and 'prices' are not properties of ICommunityPlatformProduct,
  // we cannot validate them. We only validate the single price field which exists.
  TestValidator.equals("price matches", retrievedProduct.price, product.price);
}
