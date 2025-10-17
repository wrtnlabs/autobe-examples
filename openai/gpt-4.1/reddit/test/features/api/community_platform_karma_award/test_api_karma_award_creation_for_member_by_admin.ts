import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformKarmaAward } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaAward";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate admin creation of karma award for a registered member and proper
 * rejection for invalid inputs.
 *
 * 1. Register an admin
 * 2. Register a member
 * 3. As admin, create a karma award for the member, with all required fields
 * 4. Validate the award creation response
 * 5. Negative: fail to create award for a non-existent member
 * 6. Negative: invalid award_type or event_time format fails
 * 7. Optional: create award with and without community/reason
 */
export async function test_api_karma_award_creation_for_member_by_admin(
  connection: api.IConnection,
) {
  // 1. Register (and login) an admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);
  // 2. Register a member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(15),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  // 3. As admin, create a karma award for the member (all required fields)
  const awardBody = {
    community_platform_member_id: member.id,
    // No community_platform_community_id provided (global award)
    award_type: RandomGenerator.pick([
      "gold",
      "legendary",
      "top_contributor",
    ] as const),
    award_reason: RandomGenerator.paragraph({ sentences: 6 }),
    event_time: new Date().toISOString(),
  } satisfies ICommunityPlatformKarmaAward.ICreate;
  const award = await api.functional.communityPlatform.admin.karmaAwards.create(
    connection,
    {
      body: awardBody,
    },
  );
  typia.assert(award);
  TestValidator.equals(
    "karma award member association",
    award.community_platform_member_id,
    member.id,
  );
  TestValidator.equals("award type", award.award_type, awardBody.award_type);
  TestValidator.equals(
    "award reason",
    award.award_reason,
    awardBody.award_reason,
  );
  // Optional: award.community_platform_community_id should be null/undefined as omitted
  // event_time and created_at are valid date-times
  // 4. Optionally, create an award with a community association (simulate with random uuid)
  const communityAwardBody = {
    community_platform_member_id: member.id,
    community_platform_community_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    award_type: RandomGenerator.pick([
      "gold",
      "legendary",
      "top_contributor",
    ] as const),
    // No award_reason
    event_time: new Date().toISOString(),
  } satisfies ICommunityPlatformKarmaAward.ICreate;
  const communityAward =
    await api.functional.communityPlatform.admin.karmaAwards.create(
      connection,
      {
        body: communityAwardBody,
      },
    );
  typia.assert(communityAward);
  TestValidator.equals(
    "community association set",
    communityAward.community_platform_community_id,
    communityAwardBody.community_platform_community_id,
  );
  // 5. Negative test: try awarding to non-existent member
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("fail for non-existent member", async () => {
    await api.functional.communityPlatform.admin.karmaAwards.create(
      connection,
      {
        body: {
          community_platform_member_id: nonExistentMemberId,
          award_type: "gold",
          event_time: new Date().toISOString(),
        } satisfies ICommunityPlatformKarmaAward.ICreate,
      },
    );
  });
  // 6. Negative test: invalid format for event_time
  await TestValidator.error("fail with invalid event_time format", async () => {
    await api.functional.communityPlatform.admin.karmaAwards.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          award_type: "gold",
          event_time: "not-a-datetime",
        } satisfies ICommunityPlatformKarmaAward.ICreate,
      },
    );
  });
}
