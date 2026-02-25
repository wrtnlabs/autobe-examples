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

export async function test_api_feature_flag_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator via utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // Prepare authenticated connection with token
  const authedSuperAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: superAdmin.token.access,
    },
  };
  // 2. Create a new feature flag via utility function
  const originalFeatureFlag =
    await generate_random_discussion_board_super_administrator_feature_flags_create(
      authedSuperAdminConnection,
      {},
    );
  typia.assert(originalFeatureFlag);
  // 3. Prepare updated feature flag data
  const updatedName = originalFeatureFlag.name + "_updated";
  const updatedDescription =
    originalFeatureFlag.description + " description updated.";
  const updatedEnabled = !originalFeatureFlag.enabled;
  const updateBody: IDiscussionBoardFeatureFlag.IUpdate = {
    name: updatedName,
    description: updatedDescription,
    enabled: updatedEnabled,
  };
  // 4. Update the created flag
  const updatedFeatureFlag =
    await api.functional.discussionBoard.superAdministrator.featureFlags.update(
      authedSuperAdminConnection,
      {
        id: originalFeatureFlag.id,
        body: updateBody,
      },
    );
  typia.assert(updatedFeatureFlag);
  // 5. Verify the response contains updated data
  TestValidator.equals(
    "feature flag id unchanged",
    updatedFeatureFlag.id,
    originalFeatureFlag.id,
  );
  TestValidator.equals(
    "feature flag name updated",
    updatedFeatureFlag.name,
    updatedName,
  );
  TestValidator.equals(
    "feature flag description updated",
    updatedFeatureFlag.description,
    updatedDescription,
  );
  TestValidator.equals(
    "feature flag enabled status updated",
    updatedFeatureFlag.enabled,
    updatedEnabled,
  );
  // 6. Confirm persistence by updating again with the same data and asserting
  const reloadFeatureFlag =
    await api.functional.discussionBoard.superAdministrator.featureFlags.update(
      authedSuperAdminConnection,
      {
        id: originalFeatureFlag.id,
        body: {}, // no changes
      },
    );
  typia.assert(reloadFeatureFlag);
  TestValidator.equals(
    "persisted feature flag id",
    reloadFeatureFlag.id,
    originalFeatureFlag.id,
  );
  TestValidator.equals(
    "persisted feature flag name",
    reloadFeatureFlag.name,
    updatedName,
  );
  TestValidator.equals(
    "persisted feature flag description",
    reloadFeatureFlag.description,
    updatedDescription,
  );
  TestValidator.equals(
    "persisted feature flag enabled status",
    reloadFeatureFlag.enabled,
    updatedEnabled,
  );
}
