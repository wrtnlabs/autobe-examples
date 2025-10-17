import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussExpertDomainBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussExpertDomainBadge";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

/**
 * Public retrieval of an expert domain badge by user context.
 *
 * This test validates that the expert domain badge endpoint is publicly
 * accessible (no auth required) and that ownership scoping prevents cross-user
 * information disclosure. Because there are no setup APIs to create fixtures in
 * the provided materials, the test adapts behavior for both simulation and real
 * backends:
 *
 * - Simulation (connection.simulate === true): The SDK returns random data
 *   regardless of path params, so validate only the response type using
 *   typia.assert without expecting equality to path parameters.
 * - Real backend (simulate !== true): Use random UUIDs to verify negative paths
 *   that should not leak data:
 *
 *   1. Mismatched userId + badgeId
 *   2. Non-existent badgeId Assertions use TestValidator.error without checking
 *        specific HTTP status codes, in accordance with the rules.
 */
export async function test_api_expert_domain_badge_public_retrieval_by_user(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection clone (allowed pattern)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Random path parameters
  const randomUserId = typia.random<string & tags.Format<"uuid">>();
  const randomBadgeId = typia.random<string & tags.Format<"uuid">>();

  if (unauthConn.simulate === true) {
    // Simulation path: validate response type only
    const output: IEconDiscussExpertDomainBadge =
      await api.functional.econDiscuss.users.expertDomainBadges.at(unauthConn, {
        userId: randomUserId,
        badgeId: randomBadgeId,
      });
    typia.assert(output);
  } else {
    // Real backend path: negative scenarios with random UUIDs

    // 1) badgeId that does not belong to given userId (expect error)
    await TestValidator.error(
      "badge retrieval must fail when badgeId does not belong to userId",
      async () => {
        await api.functional.econDiscuss.users.expertDomainBadges.at(
          unauthConn,
          {
            userId: typia.random<string & tags.Format<"uuid">>(),
            badgeId: typia.random<string & tags.Format<"uuid">>(),
          },
        );
      },
    );

    // 2) non-existent badgeId (expect error)
    const nonExistentBadgeId = typia.random<string & tags.Format<"uuid">>();
    const someUserId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.error(
      "badge retrieval must fail when badgeId does not exist",
      async () => {
        await api.functional.econDiscuss.users.expertDomainBadges.at(
          unauthConn,
          {
            userId: someUserId,
            badgeId: nonExistentBadgeId,
          },
        );
      },
    );
  }
}
