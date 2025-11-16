import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformTip } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTip";

export async function test_api_tip_status_update_from_completed_to_pending_rejected(
  connection: api.IConnection,
) {
  // 1. Generate a valid tip ID
  const tipId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. First, create a tip with 'pending' status
  const pendingTip: ICommunityPlatformTip =
    await api.functional.communityPlatform.tips.update(connection, {
      tipId,
      body: "pending" satisfies ICommunityPlatformTip.IUpdate,
    });
  typia.assert(pendingTip);

  // 3. Then update the tip to 'completed' status
  const completedTip: ICommunityPlatformTip =
    await api.functional.communityPlatform.tips.update(connection, {
      tipId,
      body: "completed" satisfies ICommunityPlatformTip.IUpdate,
    });
  typia.assert(completedTip);

  // 4. Attempt to update from 'completed' back to 'pending' - this should fail
  // This tests the business rule that prohibits reverting from 'completed' to 'pending'
  await TestValidator.error(
    "status transition from completed to pending should be rejected",
    async () => {
      await api.functional.communityPlatform.tips.update(connection, {
        tipId,
        body: "pending" satisfies ICommunityPlatformTip.IUpdate,
      });
    },
  );
}
