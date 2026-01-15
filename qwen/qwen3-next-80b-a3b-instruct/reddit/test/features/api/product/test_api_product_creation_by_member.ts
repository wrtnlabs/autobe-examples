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
export async function test_api_product_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Admin creates a product category
  const categoryName = RandomGenerator.name();
  const categoryDescription = RandomGenerator.content();
  const category: ICommunityPlatformProductCategory =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
          status: "active",
          parent_id: null,
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Step 3: Create member connection and authenticate via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 4: Member creates a product with required fields using the created category
  const productCode = RandomGenerator.alphaNumeric(8);
  const productTitle = RandomGenerator.name();
  const productDescription = RandomGenerator.content();
  // Safe extraction of category id using typia.assert on the assumed structure
  const categoryId = typia.assert<string & tags.Format<"uuid">>(
    category as any,
  );
  const createdProduct: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: productTitle,
          description: productDescription,
          category_id: categoryId,
          prices: [
            {
              product_code: productCode,
              currency_code: "KRW",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(createdProduct);
  // Step 5: Validate that product creation was successful with expected status and fields
  TestValidator.equals(
    "product code matches",
    createdProduct.productCode,
    productCode,
  );
  TestValidator.equals(
    "product title matches",
    createdProduct.name,
    productTitle,
  );
  TestValidator.equals(
    "product description matches",
    createdProduct.description,
    productDescription,
  );
  TestValidator.equals(
    "product category ID matches",
    createdProduct.category_id,
    categoryId,
  );
  TestValidator.equals(
    "product status should be draft",
    createdProduct.status,
    "draft",
  );
  // Validate the base price property (number) instead of prices array
  TestValidator.predicate(
    "product price is positive",
    createdProduct.price > 0,
  );
  TestValidator.predicate(
    "product creation is in the past",
    new Date(createdProduct.created_at) <= new Date(),
  );
  TestValidator.equals(
    "product owner ID matches member ID",
    createdProduct.owner_id,
    member.id,
  );
  TestValidator.predicate(
    "product has non-empty name",
    createdProduct.name.length > 0,
  );
  TestValidator.predicate(
    "product description is within bounds",
    createdProduct.description.length >= 1 &&
      createdProduct.description.length <= 2000,
  );
}
