import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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

export async function test_api_feature_flag_update(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful update of a feature flag by an authorized administrator.
  {
    const adminConnection: api.IConnection = { host: connection.host };
    // Register a new administrator account with random join data
    const adminJoinBody: IDiscussionBoardAdministrator.IJoin = {};
    const adminAuth = await authorize_administrator_join(adminConnection, {
      body: adminJoinBody,
    });
    typia.assert(adminAuth);
    // Update adminConnection headers with authorization token
    adminConnection.headers = {
      Authorization: `Bearer ${adminAuth.token.access}`,
    };
    // Prepare an existing feature flag to update
    // Generate a random UUID for the existing feature flag ID
    const existingFeatureFlagId = typia.random<string & tags.Format<"uuid">>();
    // Craft initial mutable properties for update input
    const updateBody1: IDiscussionBoardFeatureFlag.IUpdate = {
      code: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      enabled: true,
    };
    // Perform the update call for existing feature flag
    const updatedFeatureFlag1 =
      await api.functional.discussionBoard.administrator.featureFlags.updateFeatureFlag(
        adminConnection,
        {
          id: existingFeatureFlagId,
          body: updateBody1,
        },
      );
    typia.assert(updatedFeatureFlag1);
  }
  // Scenario 2: Attempt to update a feature flag with a duplicate code.
  {
    const adminConnection2: api.IConnection = { host: connection.host };
    // Register a second administrator account
    const adminJoinBody2: IDiscussionBoardAdministrator.IJoin = {};
    const adminAuth2 = await authorize_administrator_join(adminConnection2, {
      body: adminJoinBody2,
    });
    typia.assert(adminAuth2);
    adminConnection2.headers = {
      Authorization: `Bearer ${adminAuth2.token.access}`,
    };
    // Create two different feature flag codes
    const originalCode = RandomGenerator.alphabets(8);
    const duplicateCode = RandomGenerator.alphabets(8);
    // Simulate two existing feature flag IDs
    const featureFlagId1 = typia.random<string & tags.Format<"uuid">>();
    const featureFlagId2 = typia.random<string & tags.Format<"uuid">>();
    // Update first feature flag with originalCode
    const updateBodyOriginal: IDiscussionBoardFeatureFlag.IUpdate = {
      code: originalCode,
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      enabled: true,
    };
    const updatedFlag1 =
      await api.functional.discussionBoard.administrator.featureFlags.updateFeatureFlag(
        adminConnection2,
        {
          id: featureFlagId1,
          body: updateBodyOriginal,
        },
      );
    typia.assert(updatedFlag1);
    // Update second feature flag with duplicateCode
    const updateBodyDuplicate: IDiscussionBoardFeatureFlag.IUpdate = {
      code: duplicateCode,
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      enabled: true,
    };
    const updatedFlag2 =
      await api.functional.discussionBoard.administrator.featureFlags.updateFeatureFlag(
        adminConnection2,
        {
          id: featureFlagId2,
          body: updateBodyDuplicate,
        },
      );
    typia.assert(updatedFlag2);
    // Attempt to update second feature flag with originalCode again, expect uniqueness error
    await TestValidator.error("duplicate code update error", async () => {
      await api.functional.discussionBoard.administrator.featureFlags.updateFeatureFlag(
        adminConnection2,
        {
          id: featureFlagId2,
          body: {
            code: originalCode,
            name: RandomGenerator.name(1),
            description: RandomGenerator.paragraph({ sentences: 1 }),
            enabled: false,
          },
        },
      );
    });
  }
  // Scenario 3: Attempt to update a non-existent feature flag.
  {
    const adminConnection3: api.IConnection = { host: connection.host };
    // Register a third administrator account
    const adminJoinBody3: IDiscussionBoardAdministrator.IJoin = {};
    const adminAuth3 = await authorize_administrator_join(adminConnection3, {
      body: adminJoinBody3,
    });
    typia.assert(adminAuth3);
    adminConnection3.headers = {
      Authorization: `Bearer ${adminAuth3.token.access}`,
    };
    // Use a random UUID unlikely to exist
    const nonexistentId = typia.random<string & tags.Format<"uuid">>();
    // Attempt to update non-existent feature flag and expect 404 error
    await TestValidator.httpError(
      "update non-existent feature flag returns 404",
      404,
      async () => {
        await api.functional.discussionBoard.administrator.featureFlags.updateFeatureFlag(
          adminConnection3,
          {
            id: nonexistentId,
            body: {
              code: RandomGenerator.alphabets(8),
              name: RandomGenerator.name(2),
              description: RandomGenerator.paragraph({ sentences: 3 }),
              enabled: false,
            },
          },
        );
      },
    );
  }
}
