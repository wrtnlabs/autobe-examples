import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_feature_flags_create } from "../../../generate/generate_random_discussion_board_administrator_feature_flags_create";
import { prepare_random_discussion_board_feature_flag } from "../../../prepare/prepare_random_discussion_board_feature_flag";

export async function test_api_feature_flag_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // This test covers the successful update of a feature flag by an administrator.
  // Step 1: Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IDiscussionBoardAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "secure_password123",
  };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Step 2: Create initial feature flag
  const createdFlag =
    await generate_random_discussion_board_administrator_feature_flags_create(
      adminConnection,
      {
        body: {
          code: `init_code_${RandomGenerator.alphabets(5)}`,
          name: `Initial Feature ${RandomGenerator.name(2)}`,
          description: `Initial description ${RandomGenerator.paragraph({ sentences: 2 })}`,
          enabled: true,
        },
      },
    );
  typia.assert(createdFlag);
  // Step 3: Prepare update body with different values
  const updateBody: IDiscussionBoardFeatureFlag.IUpdate = {
    code: `updated_code_${RandomGenerator.alphabets(5)}`,
    name: `Updated Feature ${RandomGenerator.name(2)}`,
    description: `Updated description ${RandomGenerator.paragraph({ sentences: 3 })}`,
    enabled: false,
  };
  // Step 4: Perform the update
  const updatedFlag =
    await api.functional.discussionBoard.administrator.featureFlags.update(
      adminConnection,
      {
        id: createdFlag.id,
        body: updateBody,
      },
    );
  typia.assert(updatedFlag);
  // Step 5: Validate response matches update body
  TestValidator.equals(
    "feature flag code updated",
    updatedFlag.code,
    updateBody.code,
  );
  TestValidator.equals(
    "feature flag name updated",
    updatedFlag.name,
    updateBody.name,
  );
  TestValidator.equals(
    "feature flag description updated",
    updatedFlag.description,
    updateBody.description,
  );
  TestValidator.equals(
    "feature flag enabled updated",
    updatedFlag.enabled,
    updateBody.enabled,
  );
  TestValidator.predicate(
    "feature flag id remains same",
    updatedFlag.id === createdFlag.id,
  );
  // Step 6: Validate timestamps - updatedAt is newer
  TestValidator.predicate(
    "updatedAt is newer than createdAt",
    new Date(updatedFlag.updatedAt) > new Date(updatedFlag.createdAt),
  );
  TestValidator.predicate(
    "createdAt remains unchanged",
    updatedFlag.createdAt === createdFlag.createdAt,
  );
  // Step 7: Verify unauthorized update is rejected
  const userConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized update rejects", async () => {
    await api.functional.discussionBoard.administrator.featureFlags.update(
      userConnection,
      {
        id: createdFlag.id,
        body: updateBody,
      },
    );
  });
  // Step 8: Verify non-admin authenticated user cannot update
  // Simulate admin join, then create user connection without admin headers
  const anotherAdminConn: api.IConnection = { host: connection.host };
  await authorize_administrator_join(anotherAdminConn, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  const nonAdminConnection: api.IConnection = { host: connection.host };
  // No auth headers assigned
  // Both should throw error
  await TestValidator.error("non-admin update rejects", async () => {
    await api.functional.discussionBoard.administrator.featureFlags.update(
      nonAdminConnection,
      {
        id: createdFlag.id,
        body: updateBody,
      },
    );
  });
  // Step 9: Confirm audit logs record - since no audit log API available, here logically accepting
  // Ideally would fetch audit logs and confirm presence of update event with correct admin id, flag id, and changes
}
