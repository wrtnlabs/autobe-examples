import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformTip } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTip";

/**
 * Test rejection of invalid status transition: attempting to update a tip from
 * 'refunded' to 'completed' by a payment provider system. This test validates
 * that the business rule prohibiting reverse transitions is enforced. The
 * endpoint should return a 400 Bad Request since refunds are irreversible under
 * platform financial integrity rules, even when triggered by payment provider
 * webhook.
 */
export async function test_api_tip_status_update_from_refunded_to_completed_rejected(
  connection: api.IConnection,
) {
  const tipId = typia.random<string & tags.Format<"uuid">>();
  const refundStatus = "refunded" satisfies ICommunityPlatformTip.IUpdate;

  // First, create a tip with refunded status
  const createdTip: ICommunityPlatformTip =
    await api.functional.communityPlatform.tips.update(connection, {
      tipId,
      body: refundStatus,
    });
  typia.assert(createdTip);

  // Then attempt to update from refunded to completed - this should fail
  await TestValidator.httpError(
    "cannot update tip from refunded to completed",
    400,
    async () => {
      const completedStatus =
        "completed" satisfies ICommunityPlatformTip.IUpdate;
      await api.functional.communityPlatform.tips.update(connection, {
        tipId,
        body: completedStatus,
      });
    },
  );

  // Verify the tip status remains refunded after the failed update attempt
  const verificationTip: ICommunityPlatformTip =
    await api.functional.communityPlatform.tips.update(connection, {
      tipId,
      body: refundStatus,
    });
  typia.assert(verificationTip);
}
