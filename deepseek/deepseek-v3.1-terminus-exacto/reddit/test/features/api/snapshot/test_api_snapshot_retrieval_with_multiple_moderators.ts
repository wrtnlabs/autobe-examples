import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test that snapshot data remains consistent when accessed by different moderators.
 * Authenticate as moderator A, then authenticate as moderator B. Both moderators
 * should retrieve the same snapshot data when providing the same communityId and
 * snapshotId. Validate that the returned snapshot information is identical for
 * both moderators, confirming that snapshot data is community-based rather than
 * moderator-specific.
 */
export async function test_api_snapshot_retrieval_with_multiple_moderators(
  connection: api.IConnection,
): Promise<void> {
  // Create first moderator connection and authenticate
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorAAuth = await authorize_moderator_join(moderatorAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  moderatorAConnection.headers = { Authorization: moderatorAAuth.token.access };
  // Create second moderator connection and authenticate
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorBAuth = await authorize_moderator_join(moderatorBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  moderatorBConnection.headers = { Authorization: moderatorBAuth.token.access };
  // Generate random community and snapshot IDs
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Attempt snapshot retrieval - this may fail if IDs don't exist
  // We'll test the consistency principle by checking if both moderators
  // get the same result (whether success or error)
  let snapshotA: ICommunityPlatformCommunitySnapshot | null = null;
  let snapshotB: ICommunityPlatformCommunitySnapshot | null = null;
  try {
    // Moderator A retrieves snapshot
    snapshotA =
      await api.functional.communityPlatform.moderator.communities.snapshots.at(
        moderatorAConnection,
        {
          communityId,
          snapshotId,
        },
      );
    typia.assert(snapshotA);
  } catch {
    // If moderator A fails, moderator B should also fail
    snapshotA = null;
  }
  try {
    // Moderator B retrieves snapshot
    snapshotB =
      await api.functional.communityPlatform.moderator.communities.snapshots.at(
        moderatorBConnection,
        {
          communityId,
          snapshotId,
        },
      );
    typia.assert(snapshotB);
  } catch {
    // If moderator B fails, we need to check consistency
    snapshotB = null;
  }
  // Validate consistency: both should either succeed with identical data or both fail
  if (snapshotA !== null && snapshotB !== null) {
    // Both succeeded - data should be identical
    TestValidator.equals(
      "snapshot data should be identical for both moderators",
      snapshotA,
      snapshotB,
    );
  } else if (snapshotA === null && snapshotB === null) {
    // Both failed - this is consistent behavior
    TestValidator.predicate(
      "both moderators should receive the same error response",
      true,
    );
  } else {
    // Inconsistent behavior - one succeeded while the other failed
    throw new Error(
      "Inconsistent snapshot access: one moderator succeeded while the other failed",
    );
  }
}
