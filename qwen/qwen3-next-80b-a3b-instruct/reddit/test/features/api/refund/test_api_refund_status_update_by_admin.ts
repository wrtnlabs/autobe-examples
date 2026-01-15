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
import type { ICommunityPlatformOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderRefund";
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
export async function test_api_refund_status_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      password: RandomGenerator.alphaNumeric(16), // Added required password field
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Step 4: Create section
  const section =
    await generate_random_community_platform_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_section_id: undefined, // Changed from null to undefined to match schema
          visibility_level: "public",
        } satisfies ICommunityPlatformSection.ICreate,
      },
    );
  // Step 5: Create product
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: typia.assert<
            ICommunityPlatformProductCategory & {
              id: string;
            }
          >(category).id,
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "USD",
              // Use proper range with BOTH minimum and maximum constraints (0.01 to 10000)
              amount: typia.random<
                number & tags.Minimum<0.01> & tags.Maximum<10000>
              >(),
              effective_from: new Date().toISOString(),
            },
          ],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Step 6: Create sale
  const sale = await generate_random_community_platform_member_sales_create(
    memberConnection,
    {
      body: {
        product_id: product.id,
        // Use product.price which now has proper constraints
        price: product.price,
        currency_code: "USD",
        stock_quantity: 5,
        title: "Sale:" + product.name,
        description: "Complete sale of product for testing",
        section_id: section, // Use section directly as it is a string
      } satisfies ICommunityPlatformSale.ICreate,
    },
  );
  // Step 7: Create refund request
  const refund =
    await generate_random_community_platform_member_salesrefunds_create(
      memberConnection,
      {
        body: {
          saleId: sale.id,
          // Use sale.base_price which now has proper constraints from product price
          // This value MUST satisfy ICommunityPlatformRefund.ICreate's constraints: number & Minimum<0.01> & Maximum<10000>
          amount: typia.assert<
            number & tags.Minimum<0.01> & tags.Maximum<10000>
          >(sale.base_price),
          currency: sale.currency_code,
          reason: "Product damaged on arrival",
        } satisfies ICommunityPlatformRefund.ICreate,
      },
    );
  // Step 8: Update refund status to approved
  const updatedRefund =
    await api.functional.communityPlatform.admin.salesrefunds.update(
      adminConnection,
      {
        refundId: refund.refund_id,
        body: {
          status: "approved",
          // Use refund.amount which now has proper constraints and matches ICommunityPlatformOrderRefund.IUpdate's Minimum<0.01> requirement
          amount: typia.assert<number & tags.Minimum<0.01>>(refund.amount),
          notes: "Refund approved after verification",
          refundMethod: "original_payment",
          originalTransactionId: "txn_" + RandomGenerator.alphaNumeric(16),
          receiptNumber: "RFND-" + RandomGenerator.alphaNumeric(10),
          refundReasonCode: "defective_product",
        } satisfies ICommunityPlatformOrderRefund.IUpdate,
      },
    );
  // Step 9: Validate updated refund
  typia.assert(updatedRefund);
  TestValidator.equals(
    "refund status updated",
    updatedRefund.status,
    "approved",
  );
  TestValidator.equals(
    "refund amount preserved",
    updatedRefund.amount,
    typia.assert<number & tags.Minimum<0.01>>(refund.amount),
  );
  TestValidator.equals(
    "refund notes updated",
    updatedRefund.notes,
    "Refund approved after verification",
  );
  TestValidator.equals(
    "refund method preserved",
    updatedRefund.refundMethod,
    "original_payment",
  );
  TestValidator.equals(
    "refund reason code preserved",
    updatedRefund.refundReasonCode,
    "defective_product",
  );
}
