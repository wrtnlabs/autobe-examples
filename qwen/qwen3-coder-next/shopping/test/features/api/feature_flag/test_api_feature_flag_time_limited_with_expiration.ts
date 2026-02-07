import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSystematicFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicFeatureFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_super_admin_feature_flags_create } from "../../../generate/generate_random_shopping_mall_super_admin_feature_flags_create";
import { prepare_random_shopping_mall_systematic_feature_flag } from "../../../prepare/prepare_random_shopping_mall_systematic_feature_flag";

/**
 * Test feature flag creation with expiration date.
 * Creates a time-limited feature flag and verifies it's properly stored with expiration.
 * Since IShoppingMallSystematicFeatureFlag is currently an empty type,
 * this test validates successful creation without property access.
 */
export async function test_api_feature_flag_time_limited_with_expiration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IShoppingMallSuperAdmin.IJoin =
    typia.random<IShoppingMallSuperAdmin.IJoin>();
  const loginResponse: IShoppingMallSuperAdmin.IAuthorized =
    await api.functional.shoppingMall.auth.super_admin.join(adminConnection, {
      body: adminCredentials,
    });
  typia.assert(loginResponse);
  // Update admin connection with the token from login
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: loginResponse.token.access,
  };
  // 2. Create a time-limited feature flag with future expiration
  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + 24); // 24 hours from now
  // Create feature flag with expiration
  const createdFeatureFlag: IShoppingMallSystematicFeatureFlag =
    await api.functional.shoppingMall.superAdmin.feature_flags.create(
      adminConnection,
      {
        body: {
          feature_name: `time_limited_feature_${RandomGenerator.alphaNumeric(8)}`,
          description: "A time-limited feature for testing expiration",
          is_enabled: true,
          expires_at: futureDate.toISOString(),
        } satisfies IShoppingMallSystematicFeatureFlag.ICreate,
      },
    );
  typia.assert(createdFeatureFlag);
  // 3. Validate successful creation
  // Since IShoppingMallSystematicFeatureFlag is defined as empty type {},
  // typia.assert() already validates the response structure successfully
}
