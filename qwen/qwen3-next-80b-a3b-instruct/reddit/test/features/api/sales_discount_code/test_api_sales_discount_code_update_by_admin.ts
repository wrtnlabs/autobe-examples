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
export async function test_api_sales_discount_code_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host, headers: {} };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  adminConnection.headers = adminConnection.headers || {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // Step 2: Create discount code
  const createdCode =
    await generate_random_community_platform_admin_salesdiscountcodes_create(
      adminConnection,
      {
        body: {
          discountType: "percentage",
          discountAmount: 15,
          expirationDate: typia.random<string & tags.Format<"date">>(),
          maxUses: 100,
          isActive: true,
          minimumPurchaseAmount: 50,
          maxDiscountValue: 100,
        } satisfies ICommunityPlatformSaleDiscountCode.ICreate,
      },
    );
  typia.assert(createdCode);
  // Step 3: Update discount code - use discountPercentage (not discountAmount)
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000); // Add 1 day
  const updateBody: ICommunityPlatformSaleDiscountCode.IUpdate = {
    discountPercentage: 20, // Update percentage from 15% to 20%
    expirationDate: tomorrow.toISOString(), // Use date-time format as required
    maxUses: 200,
  };
  const updatedCode =
    await api.functional.communityPlatform.admin.salesdiscountcodes.update(
      adminConnection,
      {
        discountCode: createdCode.code,
        body: updateBody,
      },
    );
  typia.assert(updatedCode);
  // Step 4: Validate update
  // After updating discountPercentage from 15 to 20 with discountType "percentage",
  // the discountAmount should now be 20 (the percentage value)
  TestValidator.equals(
    "discount amount updated",
    updatedCode.discountAmount,
    20,
  );
  TestValidator.equals(
    "expiration date updated",
    updatedCode.expirationDate,
    tomorrow.toISOString().split("T")[0],
  );
  TestValidator.equals("max uses updated", updatedCode.maxUses, 200);
  TestValidator.equals("isActive unchanged", updatedCode.isActive, true);
  TestValidator.equals(
    "discount type unchanged",
    updatedCode.discountType,
    "percentage",
  );
}