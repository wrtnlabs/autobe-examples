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
 * Validate deletion of a non-existent community membership request by a
 * platform admin.
 *
 * Business goal: Ensure that when a platform administrator attempts to delete a
 * membership request that does not exist for a given community, the API
 * responds with an error and does not mutate existing communities or users. The
 * behaviour must be stable and idempotent when the same non-existent membership
 * request is targeted multiple times.
 *
 * Test flow:
 *
 * 1. Register a platformAdmin via /auth/platformAdmin/join to obtain an
 *    authenticated platform admin context.
 * 2. As that platform admin, create a community visibility level using
 *    /communityPlatform/platformAdmin/communityVisibilityLevels with a unique
 *    `code` so that we can reference it when creating a community.
 * 3. Register a memberUser via /auth/memberUser/join to act as the community
 *    creator.
 * 4. While authenticated as the memberUser, create a new community via
 *    /communityPlatform/memberUser/communities, passing `visibilityLevelCode`
 *    that matches the code created in step 2.
 * 5. Capture the created community.identifier; this is a valid community business
 *    identifier.
 * 6. Switch authentication context back to platformAdmin (if necessary by calling
 *    /auth/platformAdmin/login again).
 * 7. Generate a random UUID string to act as a fabricated membershipRequestId that
 *    is guaranteed not to correspond to any real membership request, noting
 *    that this scenario never creates membership requests.
 * 8. Invoke DELETE
 *    /communityPlatform/platformAdmin/communities/{communityIdentifier}/membershipRequests/{membershipRequestId}
 *    via
 *    api.functional.communityPlatform.platformAdmin.communities.membershipRequests.erase,
 *    using the real communityIdentifier from step 5 and the fabricated
 *    membershipRequestId from step 7, and assert via TestValidator.error that
 *    an error is thrown. Per global rules, we do not assert the exact HTTP
 *    status code, only that a failure occurs.
 * 9. Immediately repeat the same DELETE call with the same parameters and again
 *    assert that an error is thrown, confirming idempotent error behaviour for
 *    non-existent membership requests.
 * 10. Finally, perform lightweight sanity checks to ensure that the key entities
 *     remain intact and usable after the failed deletions:
 *
 *     - Typia.assert on the created community DTO.
 *     - Optionally re-login as the memberUser to show that the account still
 *           authenticates successfully.
 */
export async function test_api_membership_request_deletion_by_platform_admin_nonexistent_request(
  connection: api.IConnection,
) {
  // 1. Platform admin registration (join)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level as platformAdmin
  const visibilityCode = `vl_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code is retained",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register a member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create a community as the member user
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community identifier matches requested identifier",
    community.identifier,
    communityIdentifier,
  );

  // 5. Ensure we are back in platformAdmin context.
  // The join call has already set the Authorization header, but we validate
  // that platformAdmin login also works and maintains auth switching.
  const adminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 6. Fabricate a non-existent membership request ID (no membership request
  // is ever created in this scenario).
  const nonExistentMembershipRequestId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 7. Attempt to delete the non-existent membership request and assert that
  // an error is thrown. We do not assert the status code, only that the
  // operation fails.
  await TestValidator.error(
    "deleting a non-existent membership request should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.membershipRequests.erase(
        connection,
        {
          communityIdentifier: community.identifier,
          membershipRequestId: nonExistentMembershipRequestId,
        },
      );
    },
  );

  // 8. Repeat the same deletion attempt to confirm idempotent error behaviour.
  await TestValidator.error(
    "repeated deletion of the same non-existent membership request should also fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.membershipRequests.erase(
        connection,
        {
          communityIdentifier: community.identifier,
          membershipRequestId: nonExistentMembershipRequestId,
        },
      );
    },
  );

  // 9. Sanity checks: ensure community and member user remain intact.
  // typia.assert on the community has already been done; we additionally
  // verify that the member user can still log in successfully.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);
}
