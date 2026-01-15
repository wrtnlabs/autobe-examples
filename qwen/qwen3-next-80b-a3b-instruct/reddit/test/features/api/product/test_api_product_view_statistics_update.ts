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
export async function test_api_product_view_statistics_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 5,
        wordMax: 10,
      }),
      referrer: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 5,
        wordMax: 10,
      }),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a product category using admin connection
  const categoryRaw =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Cast to any and then assert as a type that has id, or use as the correct type
  const category = categoryRaw as unknown as { id: string } & ICommunityPlatformProductCategory;
  // Step 3: Create member connection and register member account
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      href: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 5,
        wordMax: 10,
      }),
      referrer: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 5,
        wordMax: 10,
      }),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 4: Create product using member connection
  const productCode = `PRD-${RandomGenerator.alphaNumeric(8)}`;
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: category.id, // Now type-safe as category has id
          prices: [
            {
              product_code: productCode, // Must match product.code exactly
              currency_code: "KRW",
              amount: 10000,
              effective_from: new Date().toISOString(),
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Log in as member to ensure proper context for view tracking
  await authorize_member_login(memberConnection, {
    body: {
      email: memberConnection.headers?.Authorization
        ? "member@example.com"
        : typia.random<string & tags.Format<"email">>(),
      password: memberPassword, // Use the same password from join
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 6: Call the view statistics update endpoint to increment view count
  await api.functional.communityPlatform.saleviewstats.update(
    memberConnection,
    {
      productCode: product.productCode,
    },
  );
  // The update endpoint returns void, so we cannot validate view count directly.
  // Since there is no GET endpoint to retrieve view statistics, we validate only
  // that the entire workflow completed successfully without error.
  // This tests the business logic of the view tracking workflow, even though
  // we cannot verify the final result's content.
}