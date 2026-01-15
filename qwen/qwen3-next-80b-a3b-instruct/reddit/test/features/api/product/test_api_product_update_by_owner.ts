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
export async function test_api_product_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate admin registration data
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminRegistrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/admin/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdmin.IJoin;
  // Create admin account and capture admin password for later login
  await authorize_admin_join(adminConnection, { body: adminRegistrationData });
  // Create product category with admin connection
  const categoryRaw =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          parent_id: null,
        },
      },
    );
  // Cast to any to allow access to id despite type definition discrepancy
  const category = categoryRaw as any;
  typia.assert(category);
  // Create member connection for product operations
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate member registration data
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberRegistrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: memberPassword,
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.IJoin;
  // Register member account
  const member = await authorize_member_join(memberConnection, {
    body: memberRegistrationData,
  });
  typia.assert(member);
  // Login as member - remove href and referrer from ILogin
  const memberLoginData = {
    email: member.email,
    password: memberPassword,
  } satisfies ICommunityPlatformMember.ILogin;
  await authorize_member_login(memberConnection, { body: memberLoginData });
  // Create product with initial pricing
  const productCode = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  const productPrice = typia.random<number & tags.Minimum<0>>();
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(3),
          description: RandomGenerator.content({ paragraphs: 2 }),
          // Extract category_id from the returned category object
          category_id: typia.assert<string & tags.Format<"uuid">>(category.id),
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: productPrice,
              effective_from: new Date().toISOString(),
            },
          ],
        },
      },
    );
  typia.assert(product);
  TestValidator.equals(
    "product owner matches member",
    product.owner_id,
    member.id,
  );
  // Update product with new values
  const updatedName = RandomGenerator.name(4);
  const updatedDescription = RandomGenerator.content({ paragraphs: 3 });
  const updatedPrice = productPrice + 10.0;
  const updateResponse =
    await api.functional.communityPlatform.member.products.update(
      memberConnection,
      {
        productCode: productCode,
        body: {
          title: updatedName,
          description: updatedDescription,
          price: updatedPrice,
          product_code: productCode,
        },
      },
    );
  typia.assert(updateResponse);
  // Validate product update
  TestValidator.equals(
    "product name updated",
    updateResponse.name,
    updatedName,
  );
  TestValidator.equals(
    "product description updated",
    updateResponse.description,
    updatedDescription,
  );
  TestValidator.predicate(
    "product price increased",
    updateResponse.price > product.price,
  );
  // Verify product owner remains unchanged
  TestValidator.equals(
    "product owner unchanged",
    updateResponse.owner_id,
    member.id,
  );
  // Login as admin to test permissions
  const adminLoginData = {
    email: adminRegistrationData.email,
    password: adminPassword,
    href: "https://example.com/admin/login",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdmin.ILogin;
  await authorize_admin_login(adminConnection, { body: adminLoginData });
  // Admin should not be able to update product created by member
  await TestValidator.error(
    "admin cannot update product created by member",
    async () => {
      await api.functional.communityPlatform.member.products.update(
        adminConnection,
        {
          productCode: productCode,
          body: {
            title: "Attempted update by admin",
            product_code: productCode,
          },
        },
      );
    },
  );
}
