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

export async function test_api_community_delete_requires_admin_role(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and get authorized context
  const adminPassword = RandomGenerator.alphabets(16);
  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: adminPassword,
        displayName: RandomGenerator.name(),
        // ip is optional string; use undefined explicitly to satisfy type
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  // 2. As platform admin, create a community visibility level
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `public-${RandomGenerator.alphabets(8)}`,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 3. Register a member user and switch context to memberUser
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  // 4. As member user, create a community using the created visibility level
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `comm-${RandomGenerator.alphabets(10)}`,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  const communityIdentifier: string = community.identifier;

  // 5. Negative: attempt to delete community as member user (should error)
  await TestValidator.error(
    "member user cannot delete community via platformAdmin erase endpoint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.erase(
        connection,
        {
          communityIdentifier,
        },
      );
    },
  );

  // 6. Re-authenticate as platform admin to restore platformAdmin context
  const platformAdminLogin = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: {
        identifier: platformAdminJoin.email,
        password: adminPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminLogin);

  // 7. Positive: delete community as platform admin (should succeed)
  await api.functional.communityPlatform.platformAdmin.communities.erase(
    connection,
    {
      communityIdentifier,
    },
  );

  // Final business assertion: the fact that memberUser deletion failed
  // (caught by TestValidator.error) and platformAdmin deletion succeeded
  // (no error thrown) demonstrates role-based access control enforcement.
  TestValidator.predicate(
    "role-based access control for community deletion enforced",
    true,
  );
}
