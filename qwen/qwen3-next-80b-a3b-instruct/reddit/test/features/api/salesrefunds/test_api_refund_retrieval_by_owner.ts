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
export async function test_api_refund_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and register admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, { body: adminJoinBody });
  // Step 2: Create category and section as admin
  const category: ICommunityPlatformProductCategory =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active",
        },
      },
    );
  const section: ICommunityPlatformSection =
    await generate_random_community_platform_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  // Step 3: Create member connection and register member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinBody: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberJoinBody });
  // Step 4: Create product as member
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: typia.assert<any>(category).id satisfies string as string,
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "USD", 
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
            },
          ],
        },
      },
    );
  // Step 5: Create sale as member
  const sale: ICommunityPlatformSale =
    await generate_random_community_platform_member_sales_create(
      memberConnection,
      {
        body: {
          product_id: product.id,
          price: product.price,
          currency_code: "USD",
          stock_quantity: 1,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          section_id: typia.assert<any>(section).id satisfies string as string,
        },
      },
    );
  // Step 6: Generate a non-existent refund_id (random UUID)
  const nonExistentRefundId = typia.random<string & tags.Format<"uuid">>();
  // Step 7: Member attempts to retrieve non-existent refund — expect 404
  await TestValidator.httpError(
    "member attempts to retrieve non-existent refund, expected 404",
    404,
    async () => {
      await api.functional.communityPlatform.member.salesrefunds.at(
        memberConnection,
        {
          refundId: nonExistentRefundId,
        },
      );
    },
  );
  // Step 8: Admin attempts to retrieve non-existent refund — expect 404
  await TestValidator.httpError(
    "admin attempts to retrieve non-existent refund, expected 404",
    404,
    async () => {
      await api.functional.communityPlatform.member.salesrefunds.at(
        adminConnection,
        {
          refundId: nonExistentRefundId,
        },
      );
    },
  );
}