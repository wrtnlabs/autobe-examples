import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_membership_detail_not_found_for_mismatched_member(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (auto-authenticates as platformAdmin)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminHref = "https://admin.example.com/join" as string &
    tags.Format<"uri">;
  const adminReferrer = "https://admin.example.com/" as string &
    tags.Format<"uri">;

  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: adminHref,
      referrer: adminReferrer,
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create a visibility level for communities as platformAdmin
  const visibilityCode = "public-visible";
  const visibilityCreate =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public Visible",
          description: "Publicly visible community",
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityCreate);

  // 3. Register member user A
  const memberAHref = "https://app.example.com/signup-a" as string &
    tags.Format<"uri">;
  const memberAReferrer = "https://app.example.com/" as string &
    tags.Format<"uri">;
  const memberAPassword = "MemberAPass123!";

  const memberAJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: memberAPassword,
      ip: "127.0.0.2",
      href: memberAHref,
      referrer: memberAReferrer,
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(memberAJoin);

  const memberAId = memberAJoin.id;

  // 4. Register member user B (this will switch auth to member user B)
  const memberBHref = "https://app.example.com/signup-b" as string &
    tags.Format<"uri">;
  const memberBReferrer = "https://app.example.com/" as string &
    tags.Format<"uri">;
  const memberBPassword = "MemberBPass123!";

  const memberBJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: memberBPassword,
      ip: "127.0.0.3",
      href: memberBHref,
      referrer: memberBReferrer,
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(memberBJoin);

  const memberBId = memberBJoin.id;

  // 5. Re-login as member user A to create community and membership request
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberAJoin.email,
      password: memberAPassword,
      ip: "127.0.0.4",
      href: memberAHref,
      referrer: memberAReferrer,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  // 6. As member user A, create community X
  const communityIdentifier = RandomGenerator.alphabets(8);
  const communityCreate =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityCreate);

  // 7. As member user A, create membership request for community X
  const membershipRequestCreate =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier,
        body: {
          questionKey: "why_join",
          answerText: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate,
      },
    );
  typia.assert(membershipRequestCreate);

  // 8. Register community moderator (auto-authenticates as communityModerator)
  const moderatorHref = "https://moderator.example.com/join" as string &
    tags.Format<"uri">;
  const moderatorReferrer = "https://moderator.example.com/" as string &
    tags.Format<"uri">;
  const moderatorPassword = "ModeratorPass123!";

  const moderatorJoin = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: moderatorPassword,
        display_name: RandomGenerator.name(2),
        ip: "127.0.0.5",
        href: moderatorHref,
        referrer: moderatorReferrer,
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    },
  );
  typia.assert(moderatorJoin);

  // 9. As communityModerator, create membership M for member user A in community X
  const membershipCreate =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier,
        body: {
          memberuser_id: memberAId,
          is_active: true,
        } satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membershipCreate);

  const membershipId = membershipCreate.id;

  // Verify membership is linked to member user A
  TestValidator.equals(
    "membership should belong to member user A",
    membershipCreate.memberuser.id,
    memberAId,
  );

  // 10. Switch to platformAdmin again using login
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: adminJoin.email,
      password: adminPassword,
      ip: "127.0.0.6",
      href: adminHref,
      referrer: adminReferrer,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  // 11. As platformAdmin, attempt to fetch membership by mismatched memberUserId (member B) + membershipId
  await TestValidator.error(
    "platformAdmin should not see membership when memberUserId does not own it",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.communityMemberships.at(
        connection,
        {
          memberUserId: memberBId,
          membershipId,
        },
      );
    },
  );

  // 12. Positive control: with correct memberUserId (member A), membership should be retrievable
  const membershipForA =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMemberships.at(
      connection,
      {
        memberUserId: memberAId,
        membershipId,
      },
    );
  typia.assert(membershipForA);

  TestValidator.equals(
    "retrieved membership id should match",
    membershipForA.id,
    membershipId,
  );

  TestValidator.equals(
    "retrieved membership should still belong to member user A",
    membershipForA.memberuser.id,
    memberAId,
  );
}
