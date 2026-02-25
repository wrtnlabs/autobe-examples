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

export async function test_api_feature_flag_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  // Prepare new connection with proper authorization header
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Create a feature flag resource with valid data
  const createdFlag =
    await generate_random_discussion_board_super_administrator_feature_flags_create(
      authorizedConnection,
      {},
    );
  typia.assert(createdFlag);
  // 3. Retrieve the created feature flag by id
  const retrievedFlag =
    await api.functional.discussionBoard.superAdministrator.featureFlags.at(
      authorizedConnection,
      { id: createdFlag.id },
    );
  typia.assert(retrievedFlag);
  // 4. Validate the retrieved data matches the created one
  TestValidator.equals("feature flag ID", retrievedFlag.id, createdFlag.id);
  TestValidator.equals(
    "feature flag code",
    retrievedFlag.code,
    createdFlag.code,
  );
  TestValidator.equals(
    "feature flag name",
    retrievedFlag.name,
    createdFlag.name,
  );
  TestValidator.equals(
    "feature flag description",
    retrievedFlag.description,
    createdFlag.description,
  );
  TestValidator.equals(
    "feature flag enabled status",
    retrievedFlag.enabled,
    createdFlag.enabled,
  );
  TestValidator.equals(
    "feature flag createdAt",
    retrievedFlag.createdAt,
    createdFlag.createdAt,
  );
  TestValidator.equals(
    "feature flag updatedAt",
    retrievedFlag.updatedAt,
    createdFlag.updatedAt,
  );
  TestValidator.equals(
    "feature flag deletedAt should both be null or equal",
    retrievedFlag.deletedAt ?? null,
    createdFlag.deletedAt ?? null,
  );
  // 5. Test unauthorized access returns 401 or 403
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized retrieval",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdministrator.featureFlags.at(
        unauthorizedConnection,
        { id: createdFlag.id },
      );
    },
  );
}
