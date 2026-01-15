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
import type { ICommunityPlatformSale } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSale";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import { prepare_random_community_platform_section } from "../../../prepare/prepare_random_community_platform_section";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_sale } from "../../../prepare/prepare_random_community_platform_sale";
import { generate_random_community_platform_admin_sections_create } from "../../../generate/generate_random_community_platform_admin_sections_create";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_sales_create } from "../../../generate/generate_random_community_platform_member_sales_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_sale_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Create section for categorization
  const section =
    await generate_random_community_platform_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  // Create product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active" as const,
        },
      },
    );
  // Generate a unique product code first
  const productCode = RandomGenerator.alphaNumeric(10);
  // Define the product price
  const productPrice = {
    product_code: productCode,
    currency_code: "KRW",
    amount: 50000,
    effective_from: new Date().toISOString(),
  } satisfies ICommunityPlatformProductPrice.ICreate;
  // Create the product using the productCode
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 3,
            wordMax: 8,
          }),
          category_id: typia.random<string & tags.Format<"uuid">>(), // FIXED: Use random UUID for category_id
          prices: [productPrice],
        },
      },
    );
  // Create sale using member connection
  const sale = await generate_random_community_platform_member_sales_create(
    memberConnection,
    {
      body: {
        product_id: product.id,
        price: 50000,
        currency_code: "KRW",
        stock_quantity: 10,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
        section_id: section, // FIXED: Use section string directly
      },
    },
  );
  typia.assert(sale);
  // Attempt to update sale status to 'completed' with correct member connection
  const updatedSale =
    await api.functional.communityPlatform.member.sales.update(
      memberConnection,
      {
        saleCode: sale.id,
        body: {
          status: "completed",
          totalAmount: 50000,
        } satisfies ICommunityPlatformSale.IUpdate,
      },
    );
  typia.assert(updatedSale);
  // Verify admin cannot modify member's sale (authorization boundary)
  await TestValidator.error("admin cannot update member's sale", async () => {
    await api.functional.communityPlatform.member.sales.update(
      adminConnection,
      {
        saleCode: sale.id,
        body: {
          status: "completed",
          totalAmount: 55000,
        } satisfies ICommunityPlatformSale.IUpdate,
      },
    );
  });
  // Verify sale cannot be updated after completion (final state validation)
  await TestValidator.error(
    "cannot update completed sale to other state",
    async () => {
      await api.functional.communityPlatform.member.sales.update(
        memberConnection,
        {
          saleCode: sale.id,
          body: {
            status: "completed",
          } satisfies ICommunityPlatformSale.IUpdate,
        },
      );
    },
  );
}
