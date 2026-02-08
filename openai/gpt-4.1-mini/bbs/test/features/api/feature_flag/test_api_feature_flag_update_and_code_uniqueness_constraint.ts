import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { generate_random_discussion_board_super_administrator_feature_flags_create } from "../../../generate/generate_random_discussion_board_super_administrator_feature_flags_create";

export async function test_api_feature_flag_update_and_code_uniqueness_constraint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {},
  });
  // 2. Create initial feature flag for update
  const originalFeatureFlag =
    await generate_random_discussion_board_super_administrator_feature_flags_create(
      superAdminConnection,
      {},
    );
  typia.assert(originalFeatureFlag);
  // 3. Successful update test
  {
    const updateBody: any = {};
    if (typeof (originalFeatureFlag as any).code === "string")
      updateBody.code = (originalFeatureFlag as any).code + "_updated";
    if (typeof (originalFeatureFlag as any).name === "string")
      updateBody.name = (originalFeatureFlag as any).name + " Updated";
    if (typeof (originalFeatureFlag as any).description === "string")
      updateBody.description = (originalFeatureFlag as any).description + " Updated";
    if (typeof (originalFeatureFlag as any).enabled === "boolean")
      updateBody.enabled = !(originalFeatureFlag as any).enabled;
    const updatedFeatureFlag = await api.functional.discussionBoard.superAdministrator.featureFlags.updateFeatureFlag(
      superAdminConnection,
      {
        id: (originalFeatureFlag as any).id,
        body: updateBody,
      },
    );
    typia.assert(updatedFeatureFlag);
    if ((updateBody as any).code !== undefined) {
      TestValidator.equals(
        "feature flag code updated",
        (updatedFeatureFlag as any).code,
        (updateBody as any).code,
      );
    }
    if ((updateBody as any).name !== undefined) {
      TestValidator.equals(
        "feature flag name updated",
        (updatedFeatureFlag as any).name,
        (updateBody as any).name,
      );
    }
    if ((updateBody as any).description !== undefined) {
      TestValidator.equals(
        "feature flag description updated",
        (updatedFeatureFlag as any).description,
        (updateBody as any).description,
      );
    }
    if ((updateBody as any).enabled !== undefined) {
      TestValidator.equals(
        "feature flag enabled toggled",
        (updatedFeatureFlag as any).enabled,
        (updateBody as any).enabled,
      );
    }
  }
  // 4. Create second feature flag for uniqueness test
  const secondFeatureFlag =
    await generate_random_discussion_board_super_administrator_feature_flags_create(
      superAdminConnection,
      {},
    );
  typia.assert(secondFeatureFlag);
  // 5. Attempt update with duplicate code - expect error
  await TestValidator.error(
    "update feature flag code uniqueness constraint",
    async () => {
      await api.functional.discussionBoard.superAdministrator.featureFlags.updateFeatureFlag(
        superAdminConnection,
        {
          id: (secondFeatureFlag as any).id,
          body: {
            code: (originalFeatureFlag as any).code,
          } satisfies Partial<IDiscussionBoardFeatureFlag.IUpdate>,
        },
      );
    },
  );
  // 6. Validate no change in second feature flag's code after failed update
  const unchangedFeatureFlag =
    await api.functional.discussionBoard.superAdministrator.featureFlags.updateFeatureFlag(
      superAdminConnection,
      {
        id: (secondFeatureFlag as any).id,
        body: {
          code: (secondFeatureFlag as any).code,
        } satisfies Partial<IDiscussionBoardFeatureFlag.IUpdate>,
      },
    );
  typia.assert(unchangedFeatureFlag);
  TestValidator.equals(
    "feature flag code unchanged after failure",
    (unchangedFeatureFlag as any).code,
    (secondFeatureFlag as any).code,
  );
}
