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

/**
 * Validate that a platform administrator can directly create an active
 * community membership for a member user in a community, even when the member
 * user has not submitted any prior membership request.
 *
 * Business context:
 *
 * - Platform admins may need to forcibly onboard or migrate users into
 *   communities (e.g., bulk onboarding, migration, or admin-driven membership
 *   management) without going through a normal membership request flow.
 * - The memberships create endpoint under the platformAdmin namespace must
 *   therefore allow creation of a membership for an arbitrary community +
 *   member user pair, provided the admin is authenticated and business
 *   constraints are met.
 *
 * This test covers a realistic multi-actor workflow:
 *
 * 1. Register a platform admin via /auth/platformAdmin/join.
 * 2. Register a member user via /auth/memberUser/join.
 * 3. Log in again as platform admin.
 * 4. Create a visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 5. Log in as member user.
 * 6. As member user, create a community with the created visibility level via
 *    /communityPlatform/memberUser/communities.
 * 7. Do NOT create any membership request; this is deliberate.
 * 8. Log back in as platform admin.
 * 9. As platform admin, call
 *    /communityPlatform/platformAdmin/communities/{communityIdentifier}/memberships
 *    with an ICommunityPlatformCommunityMembership.ICreate body that targets
 *    the member user and sets is_active = true.
 * 10. Assert that the returned membership links to the expected community and
 *     member user and that it is active with a joined_at timestamp.
 */
export async function test_api_community_membership_creation_by_platform_admin_without_prior_membership_request(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) and keep credentials
  const adminUsername: string = RandomGenerator.alphabets(12);
  const adminEmail: string = `${RandomGenerator.alphabets(8)}@admin.example.com`;
  const adminPassword: string = "AdminPassword123!";
  const adminHref: string = "https://admin.example.com/register";
  const adminReferrer: string = "https://admin.example.com/landing";

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail as string & tags.Format<"email">,
        password: adminPassword,
        displayName: RandomGenerator.name(2),
        ip: undefined,
        href: adminHref as string & tags.Format<"uri">,
        referrer: adminReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(adminAuthorized);

  // 2. Register a member user (join) and keep credentials
  const memberUsername: string = RandomGenerator.alphabets(12);
  const memberEmail: string = `${RandomGenerator.alphabets(8)}@user.example.com`;
  const memberPassword: string = "MemberPassword123!";
  const memberHref: string = "https://app.example.com/register";
  const memberReferrer: string = "https://app.example.com/home";

  const memberAuthorizedOnJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail as string & tags.Format<"email">,
        password: memberPassword,
        ip: undefined,
        href: memberHref as string & tags.Format<"uri">,
        referrer: memberReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberAuthorizedOnJoin);

  const memberId: string & tags.Format<"uuid"> = memberAuthorizedOnJoin.id;

  // 3. Switch back to platform admin via login to ensure admin context
  const adminLoginHref: string = "https://admin.example.com/login";
  const adminLoginReferrer: string = "https://admin.example.com/landing";

  const adminAuthorizedOnLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: adminEmail,
        password: adminPassword,
        ip: undefined,
        href: adminLoginHref as string & tags.Format<"uri">,
        referrer: adminLoginReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(adminAuthorizedOnLogin);

  // 4. As platform admin, create a visibility level
  const visibilityCode: string = `vis_${RandomGenerator.alphabets(8)}`;
  const visibilityName: string = "Test Visibility Level";

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: visibilityName,
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "created visibility level code should match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 5. Switch to member user via login
  const memberLoginHref: string = "https://app.example.com/login";
  const memberLoginReferrer: string = "https://app.example.com/home";

  const memberAuthorizedOnLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberEmail,
        password: memberPassword,
        ip: undefined,
        href: memberLoginHref as string & tags.Format<"uri">,
        referrer: memberLoginReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberAuthorizedOnLogin);

  TestValidator.equals(
    "member id from login should equal id from join",
    memberAuthorizedOnLogin.id,
    memberId,
  );

  // 6. As member user, create a community with the created visibility level
  const communityIdentifier: string = `test-community-${RandomGenerator.alphabets(8)}`;
  const communityTitle: string = "Test Community For Admin Membership Creation";

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: communityTitle,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          // primaryTagIds is optional; omit for simplicity
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier should match requested identifier",
    community.identifier,
    communityIdentifier,
  );

  // 7. Purposefully do NOT create any membership request; we go directly to membership creation.

  // 8. Switch back to platform admin context again
  const adminAuthorizedForMembership: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: adminEmail,
        password: adminPassword,
        ip: undefined,
        href: adminLoginHref as string & tags.Format<"uri">,
        referrer: adminLoginReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(adminAuthorizedForMembership);

  // 9. As platform admin, create a community membership for the member user
  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          memberuser_id: memberId,
          is_active: true,
        } satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership);

  // 10. Assertions on the membership to validate relationships and flags
  TestValidator.equals(
    "membership community id should match created community id",
    membership.community.id,
    community.id,
  );

  TestValidator.equals(
    "membership memberuser id should match target member user id",
    membership.memberuser.id,
    memberId,
  );

  TestValidator.equals(
    "membership is_active flag should be true",
    membership.is_active,
    true,
  );

  // joined_at is validated structurally by typia.assert; here we only check presence via simple predicate
  TestValidator.predicate(
    "membership joined_at should be a non-empty string",
    typeof membership.joined_at === "string" && membership.joined_at.length > 0,
  );
}
