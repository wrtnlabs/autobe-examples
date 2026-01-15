import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSaleDiscountCode } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleDiscountCode";
import { prepare_random_community_platform_sale_discount_code } from "../../../prepare/prepare_random_community_platform_sale_discount_code";
import { generate_random_community_platform_admin_salesdiscountcodes_create } from "../../../generate/generate_random_community_platform_admin_salesdiscountcodes_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_sales_discount_code_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create an admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin with unique email
  const authResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@wrtn.io`,
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authResponse);
  // Calculate expiration date (30 days from now)
  const today = new Date();
  const expirationDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expirationDateString = expirationDate.toISOString().split("T")[0];
  // Create discount code with specific parameters
  const discountCode =
    await generate_random_community_platform_admin_salesdiscountcodes_create(
      adminConnection,
      {
        body: {
          discountType: "percentage", // Percentage type
          discountAmount: 15, // $15 discount
          expirationDate: expirationDateString, // 30-day expiration
          maxUses: 100, // 100 maximum uses
          isActive: true, // Active status
          minimumPurchaseAmount: 50, // $50 minimum purchase
          maxDiscountValue: 200, // $200 max discount value
        } satisfies ICommunityPlatformSaleDiscountCode.ICreate,
      },
    );
  typia.assert(discountCode);
  // Validate all properties
  TestValidator.equals(
    "discount type is percentage",
    discountCode.discountType,
    "percentage",
  );
  TestValidator.equals(
    "discount amount is 15",
    discountCode.discountAmount,
    15,
  );
  TestValidator.equals(
    "expiration date is in 30 days",
    discountCode.expirationDate,
    expirationDateString,
  );
  TestValidator.equals("maximum uses is 100", discountCode.maxUses, 100);
  TestValidator.equals("isActive is true", discountCode.isActive, true);
  TestValidator.predicate(
    "code is a non-empty string",
    discountCode.code.length > 0,
  );
  TestValidator.predicate(
    "code is alphanumeric",
    /^[A-Za-z0-9-]+$/.test(discountCode.code),
  );
}