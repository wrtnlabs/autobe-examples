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
import { prepare_random_community_platform_inventory_reorder_setting } from "../../../prepare/prepare_random_community_platform_inventory_reorder_setting";
import { generate_random_community_platform_admin_inventory_reorder_settings_create } from "../../../generate/generate_random_community_platform_admin_inventory_reorder_settings_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_reorder_settings_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to initialize context
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@wrtn.io`,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuthResponse);
  // Step 2: Create initial inventory reorder settings using utility function
  // Type assertion to combine ICommunityPlatformInventoryReorderSetting with IEntity to access id property
  const createResult =
    (await generate_random_community_platform_admin_inventory_reorder_settings_create(
      adminConnection,
      {},
    )) as ICommunityPlatformInventoryReorderSetting & IEntity;
  typia.assert(createResult);
  // Step 3: Test successful update with valid parameters
  const updateBody = {
    min_threshold: 15,
    replenish_quantity: 25,
  } satisfies ICommunityPlatformInventoryReorderSetting.IUpdate;
  // This will succeed since 25 > 15 and both are non-negative
  await api.functional.communityPlatform.admin.inventory_reorder_settings.update(
    adminConnection,
    {
      settingId: createResult.id,
      body: updateBody,
    },
  );
}
