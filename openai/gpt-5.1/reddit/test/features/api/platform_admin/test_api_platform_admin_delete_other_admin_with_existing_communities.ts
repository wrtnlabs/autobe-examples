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

/**
 * Validate that a platform admin can delete another admin while communities
 * exist.
 *
 * Business intent:
 *
 * - Super admin A can manage other platform admin accounts.
 * - Member users can create communities independently of platform admin
 *   lifecycle.
 * - Deleting a non-last platform admin (admin B) while communities exist should
 *   succeed and must not break member-side community operations.
 *
 * Technical steps (within available APIs):
 *
 * 1. Register super admin A via /auth/platformAdmin/join (implicitly authenticates
 *    A).
 * 2. Register a member user and create a community via /auth/memberUser/join and
 *    /communityPlatform/memberUser/communities.
 * 3. Re-authenticate as platform admin A via /auth/platformAdmin/login to ensure
 *    the connection is under A's admin context.
 * 4. Register another platform admin B via /auth/platformAdmin/join and capture
 *    B.id from ICommunityPlatformPlatformadmin.IAuthorized.
 * 5. As admin A, call DELETE
 *    /communityPlatform/platformAdmin/platformAdmins/{platformAdminId} (erase)
 *    targeting B.id. This must complete without error.
 * 6. Log back in as the member user and create a second community to demonstrate
 *    that member-side functionality remains intact after admin B is deleted.
 */
export async function test_api_platform_admin_delete_other_admin_with_existing_communities(
  connection: api.IConnection,
) {
  // 1. Register super admin A (platform admin join)
  const superAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const superAdminPassword = "SuperAdmin#123";

  const superAdminA: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: `superadmin_${RandomGenerator.alphaNumeric(8)}`,
        email: superAdminEmail,
        password: superAdminPassword,
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(superAdminA);

  TestValidator.predicate(
    "super admin A has valid id",
    () => typeof superAdminA.id === "string" && superAdminA.id.length > 0,
  );

  // 2. Register a member user and create a community
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword = "MemberUser#123";

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        email: memberEmail,
        password: memberPassword,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  TestValidator.predicate(
    "member user has valid id",
    () =>
      typeof memberAuthorized.id === "string" && memberAuthorized.id.length > 0,
  );

  // As this member user, create a community to ensure platform has existing communities
  const firstCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibilityLevelCode: "public",
          isNsfw: false,
          // primaryTagIds is optional; omit it to keep payload minimal and valid
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(firstCommunity);

  TestValidator.predicate(
    "first community has valid id",
    () => typeof firstCommunity.id === "string" && firstCommunity.id.length > 0,
  );

  // 3. Switch back to super admin A context via login
  const superAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: superAdminEmail,
        password: superAdminPassword,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(superAdminLogin);

  TestValidator.predicate(
    "super admin login id matches join id",
    () => superAdminLogin.id === superAdminA.id,
  );

  // 4. Register another platform admin B while authenticated as A
  const adminBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminBPassword = "AdminB#123";

  const adminBAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: `adminB_${RandomGenerator.alphaNumeric(8)}`,
        email: adminBEmail,
        password: adminBPassword,
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminBAuthorized);

  TestValidator.predicate(
    "admin B has valid id and is distinct from admin A",
    () =>
      typeof adminBAuthorized.id === "string" &&
      adminBAuthorized.id.length > 0 &&
      adminBAuthorized.id !== superAdminA.id,
  );

  // 5. As super admin A, delete admin B while a community exists
  await api.functional.communityPlatform.platformAdmin.platformAdmins.erase(
    connection,
    {
      platformAdminId: adminBAuthorized.id,
    },
  );

  // If erase() completes without throwing, we consider deletion successful.
  TestValidator.predicate(
    "admin B deletion completed without error while communities exist",
    true,
  );

  // 6. Confirm platform-level functionality remains by creating another community as member user
  const memberLoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberEmail,
        password: memberPassword,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAgain);

  TestValidator.predicate(
    "member user can still log in after admin B deletion",
    () => memberLoginAgain.id === memberAuthorized.id,
  );

  const secondCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          visibilityLevelCode: "public",
          isNsfw: false,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(secondCommunity);

  TestValidator.predicate(
    "second community creation succeeds after admin B deletion",
    () =>
      typeof secondCommunity.id === "string" && secondCommunity.id.length > 0,
  );
}
