import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformKarmaAward } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaAward";

/**
 * Validate permanent deletion of a karma award by admin.
 *
 * Scenario:
 *
 * 1. Register a new admin to obtain credentials.
 * 2. As that admin, create a new karma award assigned to a random member UUID.
 * 3. Delete that karma award by id.
 * 4. Confirm the API returns success (void) on deletion.
 * 5. (If a retrieval endpoint existed) Confirm award is no longer found (out of
 *    scope).
 */
export async function test_api_admin_karma_award_permanent_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        superuser: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a karma award assigned to a random member id
  const awardInput = {
    community_platform_member_id: typia.random<string & tags.Format<"uuid">>(),
    award_type: RandomGenerator.pick([
      "gold",
      "silver",
      "top_contributor",
      "legendary",
    ] as const),
    event_time: new Date().toISOString(),
    award_reason: RandomGenerator.paragraph({ sentences: 2 }),
    community_platform_community_id: null,
  } satisfies ICommunityPlatformKarmaAward.ICreate;
  const award: ICommunityPlatformKarmaAward =
    await api.functional.communityPlatform.admin.karmaAwards.create(
      connection,
      { body: awardInput },
    );
  typia.assert(award);
  TestValidator.equals(
    "award type matches input",
    award.award_type,
    awardInput.award_type,
  );
  TestValidator.equals(
    "award member id matches input",
    award.community_platform_member_id,
    awardInput.community_platform_member_id,
  );

  // 3. Delete the award
  await api.functional.communityPlatform.admin.karmaAwards.erase(connection, {
    karmaAwardId: award.id,
  });
  // 4. (If retrieval endpoint existed, attempt to fetch here and expect error)
}
