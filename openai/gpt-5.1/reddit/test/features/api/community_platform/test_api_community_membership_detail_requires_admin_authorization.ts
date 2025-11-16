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

/**
 * Verify that community membership details endpoint is restricted to platform
 * admins.
 *
 * Business goal: Ensure that the GET
 * /communityPlatform/platformAdmin/communities/{communityIdentifier}/memberships/{membershipId}
 * endpoint can only be successfully used by authenticated platformAdmin actors,
 * and that unauthenticated users, member users, and community moderators cannot
 * read membership details.
 *
 * Scenario steps:
 *
 * 1. Register a platform admin (platformAdmin.join) and rely on the SDK to set the
 *    Authorization header with the admin token.
 * 2. As that platform admin, create a community visibility level using
 *    communityPlatform.platformAdmin.communityVisibilityLevels.create. Capture
 *    its `code` to use when creating a community.
 * 3. Register a member user (memberUser.join). The SDK updates Authorization to
 *    the member user context.
 * 4. As the member user, create a community through
 *    communityPlatform.memberUser.communities.create, passing the visibility
 *    level code from step 2. Capture the resulting community identifier/slug.
 * 5. As the member user, submit a membership request for that community using
 *    communityPlatform.memberUser.communities.membershipRequests.create.
 * 6. Register a community moderator (communityModerator.join), then call
 *    communityModerator.login if needed to ensure we have a fresh moderator
 *    token set on the shared connection.
 * 7. As the community moderator, create a membership for the member user in the
 *    previously created community via
 *    communityPlatform.communityModerator.communities.memberships.create, using
 *    the member user's id and is_active = true. Capture the membership.id.
 * 8. Prepare an unauthenticated connection by cloning the existing connection but
 *    setting its headers to an empty object. Using this unauthenticated
 *    connection, attempt to call
 *    communityPlatform.platformAdmin.communities.memberships.at with the
 *    community identifier and membership id and assert via TestValidator.error
 *    that it throws an error (do NOT check specific HTTP status codes).
 * 9. Switch the shared connection Authorization to the member user by calling
 *    auth.memberUser.login with the member's email/identifier and password.
 *    Then call the memberships.at endpoint again with the same community and
 *    membership ids, asserting via TestValidator.error that access is denied.
 * 10. Switch the shared connection Authorization to the community moderator by
 *     calling auth.communityModerator.login, and again attempt to call
 *     memberships.at, asserting via TestValidator.error that it throws.
 * 11. Finally, switch back to the platform admin actor by calling
 *     auth.platformAdmin.login using the admin's login identifier and password.
 *     With the admin token installed in Authorization, call memberships.at once
 *     more using the same community identifier and membership id. This call
 *     must succeed.
 *
 *     - Use typia.assert to validate that the response conforms to
 *           ICommunityPlatformCommunityMembership.
 *     - Use TestValidator.equals to ensure that response.id matches the membership id
 *           from step 7.
 *     - Optionally, assert that the embedded member summary id matches the member
 *           user's id and that the community summary id/slug correspond to the
 *           created community.
 *
 * Notes and constraints:
 *
 * - Use only the provided DTOs: IJoin, ILogin, ICreate, and the read DTOs.
 * - All request bodies must use `satisfies DTOType` rather than type assertions.
 * - Never manipulate connection.headers directly other than creating an
 *   unauthenticated clone connection like `{ ...connection, headers: {} }`.
 * - Do not assert or depend on specific HTTP status codes; only assert that
 *   unauthorized calls throw an error.
 * - Every API call must be awaited.
 */
export async function test_api_community_membership_detail_requires_admin_authorization(
  connection: api.IConnection,
) {
  // 1. Register platform admin and keep credentials for later login.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUsername = RandomGenerator.name(1);
  const adminHref = "https://admin.example.com/register" as string &
    tags.Format<"uri">;
  const adminReferrer = "https://admin.example.com/landing" as string &
    tags.Format<"uri">;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
        displayName: RandomGenerator.name(2),
        ip: undefined,
        href: adminHref,
        referrer: adminReferrer,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(adminAuthorized);

  // 2. As platform admin, create a visibility level.
  const visibilityCode = RandomGenerator.alphaNumeric(8);
  const visibilityName = RandomGenerator.name(2);
  const visibilityCreateBody = {
    code: visibilityCode,
    name: visibilityName,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);
  TestValidator.equals(
    "created visibility level code matches request",
    visibility.code,
    visibilityCode,
  );

  // 3. Register member user and keep credentials.
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.name(1);
  const memberHref = "https://app.example.com/join" as string &
    tags.Format<"uri">;
  const memberReferrer = "https://app.example.com/home" as string &
    tags.Format<"uri">;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        ip: undefined,
        href: memberHref,
        referrer: memberReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberAuthorized);

  // 4. As member user, create a community.
  const communityIdentifier = RandomGenerator.alphaNumeric(10);
  const communityTitle = RandomGenerator.name(3);

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: communityTitle,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier matches create payload",
    community.identifier,
    communityIdentifier,
  );
  const communitySlug = community.identifier;

  // 5. As member user, submit membership request for that community.
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: communitySlug,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest);
  TestValidator.equals(
    "membership request community id matches community summary",
    membershipRequest.community.id,
    community.id,
  );

  // 6. Register community moderator and keep credentials.
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorUsername = RandomGenerator.name(1);
  const moderatorHref = "https://mod.example.com/join" as string &
    tags.Format<"uri">;
  const moderatorReferrer = "https://mod.example.com/home" as string &
    tags.Format<"uri">;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(2),
        ip: undefined,
        href: moderatorHref,
        referrer: moderatorReferrer,
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorAuthorized);

  // Ensure we can log in as moderator later; for now the join call already set the token.

  // 7. As community moderator, create a membership for the member user.
  const membershipCreateBody = {
    memberuser_id: memberAuthorized.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier: communitySlug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);
  TestValidator.equals(
    "membership community id matches created community",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member id matches member user",
    membership.memberuser.id,
    memberAuthorized.id,
  );

  const membershipId = membership.id;

  // 8. Unauthenticated access should fail.
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated caller cannot access membership detail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.memberships.at(
        unauthConnection,
        {
          communityIdentifier: communitySlug,
          membershipId,
        },
      );
    },
  );

  // 9. Member user access should fail.
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: undefined,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberReAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberReAuth);

  await TestValidator.error(
    "member user cannot access admin membership detail endpoint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.memberships.at(
        connection,
        {
          communityIdentifier: communitySlug,
          membershipId,
        },
      );
    },
  );

  // 10. Community moderator access should fail.
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: undefined,
    href: moderatorHref,
    referrer: moderatorReferrer,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorReAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorReAuth);

  await TestValidator.error(
    "community moderator cannot access platformAdmin membership detail endpoint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.memberships.at(
        connection,
        {
          communityIdentifier: communitySlug,
          membershipId,
        },
      );
    },
  );

  // 11. Platform admin access should succeed.
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: undefined,
    href: adminHref,
    referrer: adminReferrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminReAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReAuth);

  const membershipDetail: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.at(
      connection,
      {
        communityIdentifier: communitySlug,
        membershipId,
      },
    );
  typia.assert(membershipDetail);

  TestValidator.equals(
    "membership detail id matches created membership",
    membershipDetail.id,
    membershipId,
  );
  TestValidator.equals(
    "membership detail community matches created community",
    membershipDetail.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership detail member matches member user",
    membershipDetail.memberuser.id,
    memberAuthorized.id,
  );
}
