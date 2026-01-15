import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventoryExternalFactorImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryExternalFactorImpact";
import type { ICommunityPlatformInventoryReorderSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryReorderSetting";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_reorder_setting_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a new admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using the utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate a random inventory reorder setting ID
  // According to API schema, settingId must be >= 1
  const settingId = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  // Retrieve the inventory reorder setting
  const setting: ICommunityPlatformInventoryReorderSetting =
    await api.functional.communityPlatform.admin.inventory_reorder_settings.at(
      adminConnection,
      { settingId },
    );
  // Validate the entire response structure with typia.assert()
  // This performs complete type validation of all properties: month, predictedQuantity, lowerBound,
  // upperBound, confidenceLevel, seasonalityFactor, externalFactorsImpact, and reorderTrigger
  typia.assert(setting);
  // Verify system returns appropriate error for non-existent setting
  const invalidSettingId = 0; // Invalid per schema specification (must be >= 1)
  await TestValidator.error(
    "should return error for non-existent or invalid setting ID",
    async () => {
      await api.functional.communityPlatform.admin.inventory_reorder_settings.at(
        adminConnection,
        { settingId: invalidSettingId },
      );
    },
  );
}
