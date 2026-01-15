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
import type { ICommunityPlatformRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRefund";
import type { ICommunityPlatformSale } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSale";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import { prepare_random_community_platform_section } from "../../../prepare/prepare_random_community_platform_section";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_sale } from "../../../prepare/prepare_random_community_platform_sale";
import { prepare_random_community_platform_refund } from "../../../prepare/prepare_random_community_platform_refund";
import { generate_random_community_platform_admin_sections_create } from "../../../generate/generate_random_community_platform_admin_sections_create";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_sales_create } from "../../../generate/generate_random_community_platform_member_sales_create";
import { generate_random_community_platform_member_salesrefunds_create } from "../../../generate/generate_random_community_platform_member_salesrefunds_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_refund_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Step 4: Create section
  const sectionId =
    await generate_random_community_platform_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_section_id: undefined,
          visibility_level: "public",
        } satisfies ICommunityPlatformSection.ICreate,
      },
    );
  // Step 5: Create product - generate a UUID for category_id
  const category_id: string = typia.random<string & tags.Format<"uuid">>();
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 3 }),
          category_id: category_id, // Fixed: Use generated UUID
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "USD",
              amount: 10000,
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ], // Fixed: Add a price object
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Step 6: Create sale
  const sale: ICommunityPlatformSale =
    await generate_random_community_platform_member_sales_create(
      memberConnection,
      {
        body: {
          product_id: product.id,
          price: product.price,
          title: product.name,
          currency_code: "USD",
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          description: RandomGenerator.content({ paragraphs: 1 }),
          section_id: sectionId, // Fixed: Use the string ID directly
        } satisfies ICommunityPlatformSale.ICreate,
      },
    );
  // Step 7: Create refund request
  const refundRequest: ICommunityPlatformRefund =
    await generate_random_community_platform_member_salesrefunds_create(
      memberConnection,
      {
        body: {
          saleId: sale.id,
          amount: typia.random<
            number & tags.Minimum<1> & tags.Maximum<100000>
          >(),
          currency: sale.currency_code,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformRefund.ICreate,
      },
    );
  // Step 8: Retrieve refund with admin account
  const retrievedRefund =
    await api.functional.communityPlatform.admin.salesrefunds.at(
      adminConnection,
      { refundId: refundRequest.refund_id },
    );
  typia.assert(retrievedRefund);
  TestValidator.equals(
    "refund ID matches",
    retrievedRefund.refund_id,
    refundRequest.refund_id,
  );
  TestValidator.equals(
    "sale ID matches",
    retrievedRefund.sale_id,
    refundRequest.sale_id,
  );
  TestValidator.equals(
    "user ID matches",
    retrievedRefund.user_id,
    refundRequest.user_id,
  );
  TestValidator.equals(
    "amount matches",
    retrievedRefund.amount,
    refundRequest.amount,
  );
  TestValidator.equals(
    "currency matches",
    retrievedRefund.currency,
    refundRequest.currency,
  );
  TestValidator.equals("status is pending", retrievedRefund.status, "pending");
  TestValidator.equals(
    "reason matches",
    retrievedRefund.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "processing notes matches",
    retrievedRefund.processing_notes,
    "",
  );
}
