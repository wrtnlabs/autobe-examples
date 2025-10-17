import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformKarmaAward } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaAward";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate admin updating of member karma awards, including proper error
 * handling.
 *
 * 1. Register and authenticate admin, acquiring token
 * 2. Register member (to serve as karma award recipient)
 * 3. As admin, create a karma award for the member
 * 4. Update the award's reason, type, and community (random, valid uuid or null
 *    for platform-wide)
 * 5. Validate the update: updated fields reflect new values, unchanged remain
 *    intact
 * 6. Attempt update with random (non-existent) karmaAwardId; expect rejection
 * 7. Attempt update with an invalid admin connection (empty headers); expect
 *    rejection
 */
export async function test_api_karma_award_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Register a member (award recipient)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(10);
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAuth);

  // 3. Admin creates initial karma award for member
  const initialAwardPayload = {
    community_platform_member_id: memberAuth.id,
    community_platform_community_id: typia.random<
      string & tags.Format<"uuid">
    >() satisfies string as string,
    award_type: RandomGenerator.pick([
      "gold",
      "founder",
      "legendary",
      "top_contributor",
    ] as const),
    award_reason: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 8,
    }),
    event_time: new Date().toISOString(),
  } satisfies ICommunityPlatformKarmaAward.ICreate;
  const createdAward: ICommunityPlatformKarmaAward =
    await api.functional.communityPlatform.admin.karmaAwards.create(
      connection,
      {
        body: initialAwardPayload,
      },
    );
  typia.assert(createdAward);

  // 4. Prepare new update payload (change award_reason, award_type, and community)
  const updatedAwardReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedAwardType = RandomGenerator.pick([
    "legendary",
    "top_contributor",
    "silver",
  ] as const);
  const updatedCommunityId = typia.random<string & tags.Format<"uuid">>();
  const changeCommunityToNull = Math.random() < 0.5;
  const updatePayload = {
    award_reason: updatedAwardReason,
    award_type: updatedAwardType,
    community_platform_community_id: changeCommunityToNull
      ? null
      : updatedCommunityId,
    event_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +1 day
  } satisfies ICommunityPlatformKarmaAward.IUpdate;

  // 5. Update the karma award
  const updatedAward: ICommunityPlatformKarmaAward =
    await api.functional.communityPlatform.admin.karmaAwards.update(
      connection,
      {
        karmaAwardId: createdAward.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedAward);
  // 6. Validate fields
  TestValidator.equals(
    "karmaAwardId should match",
    updatedAward.id,
    createdAward.id,
  );
  TestValidator.equals(
    "member association should be unchanged",
    updatedAward.community_platform_member_id,
    memberAuth.id,
  );
  TestValidator.equals(
    "award_type should be updated",
    updatedAward.award_type,
    updatePayload.award_type,
  );
  TestValidator.equals(
    "award_reason should be updated",
    updatedAward.award_reason,
    updatePayload.award_reason,
  );
  TestValidator.equals(
    "community_platform_community_id should be updated",
    updatedAward.community_platform_community_id,
    updatePayload.community_platform_community_id,
  );
  TestValidator.equals(
    "event_time should be updated",
    updatedAward.event_time,
    updatePayload.event_time,
  );

  // 7. Attempt update with a non-existent karmaAwardId (should reject)
  const nonExistentKarmaAwardId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "updating non-existent karmaAwardId should fail",
    async () => {
      await api.functional.communityPlatform.admin.karmaAwards.update(
        connection,
        {
          karmaAwardId: nonExistentKarmaAwardId,
          body: updatePayload,
        },
      );
    },
  );

  // 8. Attempt update with an unauthorized connection (no admin token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized admin update should fail",
    async () => {
      await api.functional.communityPlatform.admin.karmaAwards.update(
        unauthConn,
        {
          karmaAwardId: createdAward.id,
          body: updatePayload,
        },
      );
    },
  );
}
