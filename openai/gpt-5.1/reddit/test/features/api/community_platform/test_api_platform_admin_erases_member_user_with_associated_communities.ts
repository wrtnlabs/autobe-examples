import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_erases_member_user_with_associated_communities(
  connection: api.IConnection,
) {
  // 1. Register a platform admin so we can use platformAdmin-only APIs.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(12),
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(),
      ip: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminJoin);

  // 2. As platform admin, create an account status definition (exercise dependency API).
  const accountStatusKey = `ACTIVE_${RandomGenerator.alphaNumeric(8)}`;
  const accountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: {
          key: accountStatusKey,
          label: `Active for ${accountStatusKey}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          isLoginAllowed: true,
          isPostingAllowed: true,
          isVotingAllowed: true,
          requiresManualReview: false,
        } satisfies ICommunityPlatformAccountStatus.ICreate,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(accountStatus);

  // 3. As platform admin, create a community visibility level used by member communities.
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(10)}`;
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Public ${visibilityCode}`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 4. Register a member user who will own communities and later be deleted.
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.alphabets(12);

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      ip: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  const memberId = memberJoin.id;

  // 5. Switch to memberUser actor by logging in with the same credentials.
  const memberLogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  TestValidator.equals(
    "member login id should match joined member id",
    memberLogin.id,
    memberId,
  );

  // 6. As member user, create a community associated with this member.
  const communityIdentifier = `test-community-${RandomGenerator.alphaNumeric(10)}`;
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });
  const communityDescription = RandomGenerator.paragraph({ sentences: 8 });

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: communityTitle,
          description: communityDescription,
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  TestValidator.equals(
    "community creator should be the member user",
    community.creator.id,
    memberId,
  );
  TestValidator.equals(
    "community visibility level code should match created visibility level",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 7. Switch back to platformAdmin actor by logging in again as platform admin.
  const adminLogin = await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: adminEmail,
      password: adminPassword,
      ip: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminLogin);

  TestValidator.equals(
    "admin login id should match joined admin id",
    adminLogin.id,
    adminJoin.id,
  );

  // 8. As platform admin, erase the member user account.
  await api.functional.communityPlatform.platformAdmin.memberUsers.erase(
    connection,
    {
      memberUserId: memberId,
    },
  );

  // 9. Verify that the deleted member can no longer authenticate.
  await TestValidator.error(
    "deleted member user should not be able to login again",
    async () => {
      await api.functional.auth.memberUser.login(connection, {
        body: {
          identifier: memberEmail,
          password: memberPassword,
          ip: RandomGenerator.alphaNumeric(8),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformMemberuser.ILoginRequest,
      });
    },
  );

  // We cannot re-fetch the community or member by ID with the provided SDK,
  // so referential integrity is validated indirectly via successful erase
  // and failed re-authentication of the deleted member.
}
