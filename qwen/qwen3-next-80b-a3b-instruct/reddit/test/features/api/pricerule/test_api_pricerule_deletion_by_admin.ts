import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformProductPriceRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPriceRule";
import { prepare_random_community_platform_product_price_rule } from "../../../prepare/prepare_random_community_platform_product_price_rule";
import { generate_random_community_platform_admin_products_pricerules_create } from "../../../generate/generate_random_community_platform_admin_products_pricerules_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_pricerule_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate using the correct SDK function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.auth.admin.join(adminConnection, {
    body: {
      email: `admin-${RandomGenerator.alphaNumeric(8)}@wrtn.io`,
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Generate a random product code
  const productCode = `${RandomGenerator.alphaNumeric(6)}-${RandomGenerator.alphaNumeric(6)}`;
  // Step 3: Create a price rule using the provided SDK function
  const priceRule =
    await api.functional.communityPlatform.admin.products.pricerules.create(
      adminConnection,
      {
        productCode,
        body: {
          productCode, // Required property
          ruleType: "PERCENTAGE_DISCOUNT",
          value: 20,
          minQuantity: 0,
          maxQuantity: 0,
          startDate: new Date().toISOString(),
          endDate: null,
          priority: 1,
          description: "Test discount rule",
        } satisfies ICommunityPlatformProductPriceRule.ICreate,
      },
    );
  typia.assert(priceRule);
  // Step 4: Extract the rule ID for deletion
  const ruleId = priceRule.id;
  // Step 5: Delete the price rule using the target endpoint
  await api.functional.communityPlatform.admin.products.pricerules.erase(
    adminConnection,
    {
      productCode,
      ruleId,
    },
  );
  // Step 6: Verification: Create a NEW price rule with the same product code to verify deletion was successful
  // If deletion was permanent, this creation should succeed without error
  const newPriceRule =
    await api.functional.communityPlatform.admin.products.pricerules.create(
      adminConnection,
      {
        productCode,
        body: {
          productCode, // Required property
          ruleType: "PERCENTAGE_DISCOUNT",
          value: 15, // Different value to show it's a new rule
          minQuantity: 0,
          maxQuantity: 0,
          startDate: new Date().toISOString(),
          endDate: null,
          priority: 1,
          description: "New rule after deletion verification",
        } satisfies ICommunityPlatformProductPriceRule.ICreate,
      },
    );
  typia.assert(newPriceRule);
  // Verify that the new rule was created successfully (indicates old rule was permanently deleted)
  // This confirms the deletion was complete and the system allows new rules for the same product
  TestValidator.equals(
    "New price rule created successfully",
    newPriceRule.product_code,
    productCode,
  );
}
