import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformKarmaAward } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaAward";

/**
 * Validate that an admin can retrieve the full detail of a specific karma award
 * by its unique identifier.
 *
 * Steps:
 *
 * 1. Register a new platform admin and authenticate.
 * 2. Create a karma award as this admin (using random data for member/community,
 *    award_type, event_time).
 * 3. Retrieve details by id using the admin endpoint.
 * 4. Validate the returned detail matches the created record.
 * 5. Confirm error on retrieval with an invalid UUID.
 */
export async function test_api_karma_award_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a karma award (platform-wide for now, could also test with community id)
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const award_type = RandomGenerator.pick([
    "gold",
    "founder",
    "legendary",
    "top_contributor",
  ] as const);
  const award_reason = RandomGenerator.paragraph({ sentences: 3 });
  const event_time = new Date().toISOString();
  const createBody = {
    community_platform_member_id: memberId,
    community_platform_community_id: null,
    award_type,
    award_reason,
    event_time,
  } satisfies ICommunityPlatformKarmaAward.ICreate;
  const created: ICommunityPlatformKarmaAward =
    await api.functional.communityPlatform.admin.karmaAwards.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);
  TestValidator.equals(
    "member id",
    created.community_platform_member_id,
    memberId,
  );
  TestValidator.equals("award type", created.award_type, award_type);
  TestValidator.equals("award reason", created.award_reason, award_reason);
  TestValidator.equals(
    "community id (platform-wide)",
    created.community_platform_community_id,
    null,
  );
  TestValidator.equals("event time", created.event_time, event_time);

  // 3. Retrieve karma award by id (should succeed and match created)
  const found = await api.functional.communityPlatform.admin.karmaAwards.at(
    connection,
    {
      karmaAwardId: created.id,
    },
  );
  typia.assert(found);
  TestValidator.equals("returned id equals created", found.id, created.id);
  TestValidator.equals(
    "returned data matches create",
    found,
    created,
    (key) => key === "created_at" || key === "deleted_at",
  );

  // 4. Retrieval by non-existent id must fail
  await TestValidator.error(
    "error thrown for invalid karmaAwardId",
    async () => {
      await api.functional.communityPlatform.admin.karmaAwards.at(connection, {
        karmaAwardId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
