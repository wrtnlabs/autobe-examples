import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaPenalty";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_karma_penalty_detail_view_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register member (will be penalized, and also become the moderator)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(10);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Register new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 3. Login as member and create a community
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          slug: RandomGenerator.alphaNumeric(6),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Login as admin and create a karma penalty for the member
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  const now = new Date();
  const penaltyCreate = {
    community_platform_member_id: member.id,
    community_platform_community_id: community.id,
    penalty_type: RandomGenerator.pick(["deduction", "suspension"] as const),
    penalty_value: typia.random<number & tags.Type<"int32">>(),
    penalty_reason: RandomGenerator.paragraph({ sentences: 5 }),
    penalty_status: "active",
    applied_at: now.toISOString(),
    expires_at: null,
  } satisfies ICommunityPlatformKarmaPenalty.ICreate;
  const penalty =
    await api.functional.communityPlatform.admin.karmaPenalties.create(
      connection,
      {
        body: penaltyCreate,
      },
    );
  typia.assert(penalty);

  // 5. Register moderator for the same community (the same penalized member for maximum coverage)
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword as string & tags.Format<"password">,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Attempt to view karma penalty detail as moderator
  const penaltyDetail =
    await api.functional.communityPlatform.moderator.karmaPenalties.at(
      connection,
      { karmaPenaltyId: penalty.id },
    );
  typia.assert(penaltyDetail);
  // Validate key penalty fields
  TestValidator.equals("penalty id matches", penaltyDetail.id, penalty.id);
  TestValidator.equals(
    "community linkage",
    penaltyDetail.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "subject member id matches",
    penaltyDetail.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "penalty type matches",
    penaltyDetail.penalty_type,
    penaltyCreate.penalty_type,
  );
  TestValidator.equals(
    "penalty reason matches",
    penaltyDetail.penalty_reason,
    penaltyCreate.penalty_reason,
  );
  TestValidator.equals(
    "penalty value matches",
    penaltyDetail.penalty_value,
    penaltyCreate.penalty_value,
  );
  TestValidator.equals(
    "penalty status matches",
    penaltyDetail.penalty_status,
    penaltyCreate.penalty_status,
  );
  // Should also validate timestamps are correct (applied_at, created_at, etc)
  TestValidator.predicate(
    "applied_at timestamp exists",
    typeof penaltyDetail.applied_at === "string" &&
      penaltyDetail.applied_at.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    typeof penaltyDetail.created_at === "string" &&
      penaltyDetail.created_at.length > 0,
  );

  // 6. Attempt unauthorized access: as member (penalized), attempt detail access. Denied.
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error(
    "non-moderator (penalized member) denied access",
    async () => {
      await api.functional.communityPlatform.moderator.karmaPenalties.at(
        connection,
        { karmaPenaltyId: penalty.id },
      );
    },
  );

  // 7. Attempt unauthorized access: as admin, attempt detail access. Denied (only moderators can use this endpoint).
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  await TestValidator.error(
    "non-moderator (admin) denied access to moderator endpoint",
    async () => {
      await api.functional.communityPlatform.moderator.karmaPenalties.at(
        connection,
        { karmaPenaltyId: penalty.id },
      );
    },
  );
}
