import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_membership_update_by_memberuser_for_inactive_membership(
  connection: api.IConnection,
) {
  // 1. Register member user (join) and retain raw password for later login
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      ip: null,
      href: "https://member.example.com/join",
      referrer: "https://member.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  const memberUserId = memberJoin.id;
  const memberEmail = memberJoin.email;

  // 2. Register platform admin (join) and retain raw password for later login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      displayName: RandomGenerator.name(),
      ip: undefined,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminJoin);

  const adminEmail = adminJoin.email;

  // 3. As platformAdmin (current token from join), create a visibility level
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Public ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. Switch to memberUser via login so subsequent memberUser calls use that actor
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://member.example.com/login",
      referrer: "https://member.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  // 5. As memberUser, create a community referencing the visibility level
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(10)}`;
  const communityTitle = `Community ${RandomGenerator.name(1)}`;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: communityTitle,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: undefined,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  TestValidator.equals(
    "community identifier should match",
    community.identifier,
    communityIdentifier,
  );

  // 6. Switch back to platformAdmin via login to create membership
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  // 7. As platformAdmin, create an inactive membership for the member user
  const createdMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          memberuser_id: memberUserId,
          is_active: false,
        } satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(createdMembership);

  TestValidator.equals(
    "created membership community id should match community",
    createdMembership.community.id,
    community.id,
  );
  TestValidator.equals(
    "created membership member user id should match member",
    createdMembership.memberuser.id,
    memberUserId,
  );
  TestValidator.equals(
    "created membership should be inactive",
    createdMembership.is_active,
    false,
  );

  const originalEndedAt = createdMembership.ended_at ?? null;

  // 8. Switch to memberUser via login again (actor that owns the membership)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://member.example.com/login",
      referrer: "https://member.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  // 9. Member user attempts to update already inactive membership to is_active=false
  const firstUpdate =
    await api.functional.communityPlatform.memberUser.communities.memberships.update(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId: createdMembership.id,
        body: {
          is_active: false,
        } satisfies ICommunityPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(firstUpdate);

  // 10. Assert invariants after first update
  TestValidator.equals(
    "membership id should remain unchanged after first update",
    firstUpdate.id,
    createdMembership.id,
  );
  TestValidator.equals(
    "membership community id should remain unchanged after first update",
    firstUpdate.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member user id should remain unchanged after first update",
    firstUpdate.memberuser.id,
    memberUserId,
  );
  TestValidator.equals(
    "membership should still be inactive after first update",
    firstUpdate.is_active,
    false,
  );

  if (originalEndedAt !== null) {
    TestValidator.predicate(
      "ended_at should remain non-null when originally non-null",
      firstUpdate.ended_at !== null,
    );
  }

  // 11. Repeat the PUT call to check idempotency with respect to is_active and ids
  const secondUpdate =
    await api.functional.communityPlatform.memberUser.communities.memberships.update(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId: createdMembership.id,
        body: {
          is_active: false,
        } satisfies ICommunityPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(secondUpdate);

  TestValidator.equals(
    "membership id should remain unchanged after second update",
    secondUpdate.id,
    createdMembership.id,
  );
  TestValidator.equals(
    "membership community id should remain unchanged after second update",
    secondUpdate.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member user id should remain unchanged after second update",
    secondUpdate.memberuser.id,
    memberUserId,
  );
  TestValidator.equals(
    "membership should still be inactive after second update",
    secondUpdate.is_active,
    false,
  );
}
