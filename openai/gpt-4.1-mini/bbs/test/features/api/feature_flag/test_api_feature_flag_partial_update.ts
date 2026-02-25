import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_super_administrator_feature_flags_create } from "../../../generate/generate_random_discussion_board_super_administrator_feature_flags_create";
import { prepare_random_discussion_board_feature_flag } from "../../../prepare/prepare_random_discussion_board_feature_flag";

export async function test_api_feature_flag_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IDiscussionBoardSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, {
      body: {
        email: "superadmin@example.com",
        password: "StrongPass123!",
        href: "https://example.com/register",
        referrer: "https://example.com/",
        ip: null,
      },
    });
  superAdminConnection.headers = { Authorization: superAdmin.token.access };
  // 2. Create a new feature flag
  const originalFeatureFlag: IDiscussionBoardFeatureFlag =
    await generate_random_discussion_board_super_administrator_feature_flags_create(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(originalFeatureFlag);
  // 3. Partial update: update only 'name' field
  const partialUpdateName: IDiscussionBoardFeatureFlag.IUpdate = {
    name: originalFeatureFlag.name + " Updated",
  };
  const updatedFeatureFlagName =
    await api.functional.discussionBoard.superAdministrator.featureFlags.update(
      superAdminConnection,
      {
        id: originalFeatureFlag.id,
        body: partialUpdateName,
      },
    );
  typia.assert(updatedFeatureFlagName);
  // 4. Check that updated fields changed only
  TestValidator.equals(
    "feature flag name updated",
    updatedFeatureFlagName.name,
    partialUpdateName.name,
  );
  TestValidator.equals(
    "feature flag code unchanged",
    updatedFeatureFlagName.code,
    originalFeatureFlag.code,
  );
  TestValidator.equals(
    "feature flag description unchanged",
    updatedFeatureFlagName.description,
    originalFeatureFlag.description,
  );
  TestValidator.equals(
    "feature flag enabled unchanged",
    updatedFeatureFlagName.enabled,
    originalFeatureFlag.enabled,
  );
  // 5. Partial update: update only 'enabled' field
  const partialUpdateEnabled: IDiscussionBoardFeatureFlag.IUpdate = {
    enabled: !originalFeatureFlag.enabled,
  };
  const updatedFeatureFlagEnabled =
    await api.functional.discussionBoard.superAdministrator.featureFlags.update(
      superAdminConnection,
      {
        id: originalFeatureFlag.id,
        body: partialUpdateEnabled,
      },
    );
  typia.assert(updatedFeatureFlagEnabled);
  // 6. Check that 'enabled' changed and other fields unchanged or equal to last update
  TestValidator.equals(
    "feature flag enabled updated",
    updatedFeatureFlagEnabled.enabled,
    partialUpdateEnabled.enabled,
  );
  TestValidator.equals(
    "feature flag code unchanged after enabled update",
    updatedFeatureFlagEnabled.code,
    updatedFeatureFlagName.code,
  );
  TestValidator.equals(
    "feature flag name unchanged after enabled update",
    updatedFeatureFlagEnabled.name,
    updatedFeatureFlagName.name,
  );
  TestValidator.equals(
    "feature flag description unchanged after enabled update",
    updatedFeatureFlagEnabled.description,
    updatedFeatureFlagName.description,
  );
}
