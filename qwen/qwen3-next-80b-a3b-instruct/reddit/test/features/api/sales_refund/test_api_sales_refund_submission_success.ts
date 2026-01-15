import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRefund";
import type { ICommunityPlatformSale } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSale";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_sale } from "../../../prepare/prepare_random_community_platform_sale";
import { prepare_random_community_platform_refund } from "../../../prepare/prepare_random_community_platform_refund";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_member_sales_create } from "../../../generate/generate_random_community_platform_member_sales_create";
import { generate_random_community_platform_member_salesrefunds_create } from "../../../generate/generate_random_community_platform_member_salesrefunds_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_sales_refund_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create product for sale
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8), // Use the product code from the same creation
              currency_code: "USD",
              amount: 100.0,
              effective_from: new Date().toISOString(),
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Step 3: Create sale transaction for the product using the created product's id
  const sale: ICommunityPlatformSale =
    await generate_random_community_platform_member_sales_create(
      memberConnection,
      {
        body: {
          product_id: product.id, // Use the actual product ID from the returned product object
          price: 100.0,
          currency_code: "USD",
          stock_quantity: 1,
          title: product.name, // Use name from product object, not title
          description: product.description,
          section_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityPlatformSale.ICreate,
      },
    );
  // Step 4: Submit refund request for the sale
  const refund: ICommunityPlatformRefund =
    await generate_random_community_platform_member_salesrefunds_create(
      memberConnection,
      {
        body: {
          saleId: sale.id,
          amount: 100.0, // Match exact sale amount
          currency: "USD",
          reason: "Product received damaged", // Within 500 char limit
        } satisfies ICommunityPlatformRefund.ICreate,
      },
    );
  // Step 5: Validate refund submission
  typia.assert(refund);
  TestValidator.equals(
    "refund status should be pending",
    refund.status,
    "pending",
  );
  TestValidator.equals("refund amount matches sale", refund.amount, 100.0);
  TestValidator.equals("refund currency matches sale", refund.currency, "USD");
  TestValidator.equals(
    "refund sale_id matches original sale",
    refund.sale_id,
    sale.id,
  );
  TestValidator.equals(
    "refund user_id matches member",
    refund.user_id,
    member.id,
  );
}
