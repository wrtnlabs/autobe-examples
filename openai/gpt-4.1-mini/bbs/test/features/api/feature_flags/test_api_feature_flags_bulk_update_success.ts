import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { ArrayUtil, TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { generate_random_discussion_board_administrator_feature_flags_create } from "../../../generate/generate_random_discussion_board_administrator_feature_flags_create";

export async function test_api_feature_flags_bulk_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator by joining
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });

  // 2. Create multiple feature flags to bulk update
  const featureFlags = await Promise.all(
    ArrayUtil.repeat(3, async () =>
      generate_random_discussion_board_administrator_feature_flags_create(
        adminConnection,
        {
          body: typia.random<IDiscussionBoardFeatureFlag.ICreate>(),
        },
      ),
    ),
  );

  // 3. Prepare bulk update payload, safely asserting required properties exist
  const bulkUpdatePayload = featureFlags.map((flag) => {
    const id = (flag as any).id;
    const enabled = (flag as any).enabled;
    if (typeof id !== "string") throw new Error("Feature flag missing id");
    if (typeof enabled !== "boolean") throw new Error("Feature flag missing enabled");
    return typia.assert<IDiscussionBoardFeatureFlag.IUpdate>({ id, enabled: !enabled });
  });

  // 4. Call the bulk update API with the admin connection
  const updatedFeatureFlags =
    await api.functional.discussionBoard.feature_flags.bulk_update.bulkUpdate(
      adminConnection,
      { body: bulkUpdatePayload },
    );

  typia.assert(updatedFeatureFlags);

  // 5. Validate that each updated flag toggled 'enabled' state correctly
  for (const updatedFlag of updatedFeatureFlags.data) {
    // The items inside updatedFeatureFlags.data may be ISummary; assert id and enabled
    const id = (updatedFlag as any).id;
    const enabled = (updatedFlag as any).enabled;
    if (typeof id !== "string") throw new Error("Updated flag missing id");
    if (typeof enabled !== "boolean") throw new Error("Updated flag missing enabled");

    // find original flag by id
    const originalFlag = featureFlags.find((flag) => (flag as any).id === id);
    if (!originalFlag) {
      throw new Error(`Original flag not found for id ${id}`);
    }
    const originalEnabled = (originalFlag as any).enabled;

    TestValidator.equals(
      `Feature flag ${id} enabled state toggled`,
      enabled,
      !originalEnabled,
    );
  }
}
