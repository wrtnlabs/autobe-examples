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
export async function test_api_refund_rejection_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate - removed password field (not in schema)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create member connection and authenticate - password properly included
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create product category via admin
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: undefined,
        },
      },
    );
  typia.assert(category);
  // Step 4: Create section via admin
  const section =
    await generate_random_community_platform_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_section_id: undefined,
        },
      },
    );
  typia.assert(section);
  // Step 5: Create product using member - generate UUID for category_id
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 3 }),
          category_id: typia.random<string & tags.Format<"uuid">>(), // Use random UUID to satisfy type
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              effective_to: undefined,
              quantity_min: 1,
              quantity_max: undefined,
              notes: undefined,
              source: undefined,
              region: undefined,
              price_type: undefined,
              tax_rate: undefined,
              unit: undefined,
            },
          ],
          images: [],
        },
      },
    );
  typia.assert(product);
  // Step 6: Create sale using member - generate UUID for section_id
  const sale = await generate_random_community_platform_member_sales_create(
    memberConnection,
    {
      body: {
        product_id: product.id,
        price: product.price,
        currency_code: "USD",
        stock_quantity: 10,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        section_id: typia.random<string & tags.Format<"uuid">>(), // Generate UUID to satisfy section_id constraint
      },
    },
  );
  typia.assert(sale);
  // Step 7: Create a refund request using member (customer)
  const refundRequest =
    await generate_random_community_platform_member_salesrefunds_create(
      memberConnection,
      {
        body: {
          saleId: sale.id,
          amount: Math.max(0.01, sale.base_price * 0.75),
          currency: sale.currency_code,
          reason: "Product arrived damaged with broken components",
        },
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund status is pending",
    refundRequest.status,
    "pending",
  );
  // Step 8: Reject the refund as admin using correct ICommunityPlatformOrderRefund.IUpdate properties
  const refund =
    await api.functional.communityPlatform.admin.salesrefunds.update(
      adminConnection,
      {
        refundId: refundRequest.refund_id,
        body: {
          status: "rejected",
          amount: refundRequest.amount satisfies number as number,
          notes:
            "Refund rejected due to policy violation: customer has submitted multiple fraudulent refund requests in the past 30 days",
          refundMethod: "original_payment",
          originalTransactionId: typia.assert(
            sale.id satisfies string & tags.Format<"uuid"> as string,
          ),
          receiptNumber: `RFND-${typia.random<string & tags.Format<"uuid">>()}`,
          refundReasonCode: "customer_unsatisfied",
        },
      },
    );
  typia.assert(refund);
  TestValidator.equals("refund status is rejected", refund.status, "rejected");
  TestValidator.equals(
    "refund amount unchanged",
    refund.amount,
    refundRequest.amount satisfies number as number,
  );
  TestValidator.predicate(
    "processing notes recorded",
    refund.notes !== undefined &&
      refund.notes !== null &&
      refund.notes.length > 0,
  );
}
