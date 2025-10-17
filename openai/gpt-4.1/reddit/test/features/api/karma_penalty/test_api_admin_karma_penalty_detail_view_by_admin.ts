import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaPenalty";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test administrator karma penalty detail retrieval scenario.
 *
 * Validates all business logic, data flow and role-based restrictions:
 *
 * 1. Register an admin (using unique email, password)
 * 2. Register a member (unique email, password)
 * 3. Member creates a community (unique name, slug)
 * 4. Admin creates a karma penalty for that member in that community
 * 5. Admin retrieves full penalty detail by penalty ID and confirms all details
 * 6. Attempts to GET the detail as unauthorized user and confirms denied access
 */
export async function test_api_admin_karma_penalty_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        superuser: true,
      },
    });
  typia.assert(admin);
  // log in as admin happens automatically by SDK via token

  // 2. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      },
    });
  typia.assert(member);

  // 3. Member creates a new community
  // Switch to member (SDK token switch on join)
  const communityName = RandomGenerator.alphabets(8);
  const communitySlug = RandomGenerator.alphaNumeric(10);
  const communityTitle = RandomGenerator.name();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: communityTitle,
          description: RandomGenerator.paragraph({ sentences: 10 }),
          slug: communitySlug,
        },
      },
    );
  typia.assert(community);

  // 4. Switch back to admin
  // SDK: to switch back to admin, perform another join/login
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    },
  });

  // 5. Admin creates a karma penalty for member in the community
  const penaltyApplied = new Date().toISOString();
  const penaltyExpires = new Date(
    Date.now() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 3 days
  const penaltyInput: ICommunityPlatformKarmaPenalty.ICreate = {
    community_platform_member_id: member.id,
    community_platform_community_id: community.id,
    penalty_type: "deduction",
    penalty_value: -15,
    penalty_reason: "Violation of rules: spammy link posting",
    penalty_status: "active",
    applied_at: penaltyApplied,
    expires_at: penaltyExpires,
  };
  const createdPenalty: ICommunityPlatformKarmaPenalty =
    await api.functional.communityPlatform.admin.karmaPenalties.create(
      connection,
      { body: penaltyInput },
    );
  typia.assert(createdPenalty);

  // 6. Admin retrieves karma penalty detail by ID
  const penaltyDetail: ICommunityPlatformKarmaPenalty =
    await api.functional.communityPlatform.admin.karmaPenalties.at(connection, {
      karmaPenaltyId: createdPenalty.id,
    });
  typia.assert(penaltyDetail);
  TestValidator.equals(
    "member ID is correct",
    penaltyDetail.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "community ID is correct",
    penaltyDetail.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "penalty type matches",
    penaltyDetail.penalty_type,
    penaltyInput.penalty_type,
  );
  TestValidator.equals(
    "penalty value matches",
    penaltyDetail.penalty_value,
    penaltyInput.penalty_value,
  );
  TestValidator.equals(
    "penalty reason matches",
    penaltyDetail.penalty_reason,
    penaltyInput.penalty_reason,
  );
  TestValidator.equals(
    "penalty status matches",
    penaltyDetail.penalty_status,
    penaltyInput.penalty_status,
  );
  TestValidator.equals(
    "applied_at matches",
    penaltyDetail.applied_at,
    penaltyInput.applied_at,
  );
  TestValidator.equals(
    "expires_at matches",
    penaltyDetail.expires_at,
    penaltyInput.expires_at,
  );

  // 7. (Negative case) Try to fetch detail as a member (should fail)
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  await TestValidator.error(
    "non-admin is denied for karma penalty detail view",
    async () => {
      await api.functional.communityPlatform.admin.karmaPenalties.at(
        connection,
        { karmaPenaltyId: createdPenalty.id },
      );
    },
  );
}
