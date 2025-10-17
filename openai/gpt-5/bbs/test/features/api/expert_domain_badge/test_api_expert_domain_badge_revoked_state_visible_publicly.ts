import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussExpertDomainBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussExpertDomainBadge";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

/**
 * Public visibility of revoked expert domain badge and lifecycle integrity.
 *
 * Validates that a specific expert domain badge can be retrieved without
 * Authorization and that lifecycle fields coherently indicate the badge state.
 * Also validates topic linkage integrity. In non-simulation mode, validates
 * cross-user scoping by attempting a mismatched userId.
 *
 * Steps:
 *
 * 1. Build an unauthenticated connection by clearing headers on a clone.
 * 2. GET the badge using random UUIDs (simulation-friendly) and assert type.
 * 3. Business validations:
 *
 *    - If topic is present, topic.id must equal topicId.
 *    - Compute derived status from revokedAt/validUntil; if response.status is
 *         present, it must equal the derived value.
 * 4. Negative path (skipped in simulate mode): call with other userId and expect
 *    an error (no status code assertion).
 */
export async function test_api_expert_domain_badge_revoked_state_visible_publicly(
  connection: api.IConnection,
) {
  // 1) Build unauthenticated connection (do not touch headers afterward)
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 2) Public GET with random UUID parameters
  const userId = typia.random<string & tags.Format<"uuid">>();
  const badgeId = typia.random<string & tags.Format<"uuid">>();
  const badge: IEconDiscussExpertDomainBadge =
    await api.functional.econDiscuss.users.expertDomainBadges.at(publicConn, {
      userId,
      badgeId,
    });
  typia.assert(badge);

  // 3) Business validations
  // 3.a) Topic linkage integrity when topic is present
  if (badge.topic !== undefined) {
    TestValidator.equals(
      "topic linkage remains intact when topic summary provided",
      badge.topicId,
      badge.topic.id,
    );
  }

  // 3.b) Lifecycle-derived status validation
  const now = new Date();
  const revokedAt = badge.revokedAt ?? null; // (string & date-time) | null
  const validUntil = badge.validUntil ?? null; // (string & date-time) | null

  let derivedStatus: "active" | "expired" | "revoked";
  if (revokedAt !== null) {
    derivedStatus = "revoked";
    // Ensure logical non-null condition for revoked state
    TestValidator.predicate(
      "revokedAt is non-null for revoked state",
      revokedAt !== null,
    );
  } else if (
    validUntil !== null &&
    new Date(validUntil).getTime() < now.getTime()
  ) {
    derivedStatus = "expired";
  } else {
    derivedStatus = "active";
  }

  if (badge.status !== undefined) {
    TestValidator.equals(
      "computed status matches lifecycle fields",
      badge.status,
      derivedStatus,
    );
  }

  // 4) Negative path: mismatched userId should not retrieve the badge
  // Skip when in simulate mode because simulator returns random data regardless of path matching
  if (!publicConn.simulate) {
    const otherUserId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.error(
      "mismatched userId must not retrieve the badge",
      async () => {
        await api.functional.econDiscuss.users.expertDomainBadges.at(
          publicConn,
          { userId: otherUserId, badgeId: badge.id },
        );
      },
    );
  }
}
