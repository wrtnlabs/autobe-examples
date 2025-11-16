import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that a member user cannot update another member users community
 * membership request.
 *
 * Business context:
 *
 * - Membership requests are owned by the requesting member user and are editable
 *   only by that owner while in an editable state (typically `pending`).
 * - The update endpoint
 *   `/communityPlatform/memberUser/communities/{communityIdentifier}/membershipRequests/{membershipRequestId}`
 *   is documented to update a membership request owned by the authenticated
 *   member user, which implies an ownership check.
 *
 * This test builds a full multi-actor scenario:
 *
 * 1. Create a platform admin and log in as that admin to create a visibility level
 *    for communities.
 * 2. Create two member users: Member A (the request owner) and Member B (an
 *    unrelated member).
 * 3. As Member A, create a community that uses the platform-admin-created
 *    visibility level.
 * 4. As Member A, create a membership request for that community and capture its
 *    id and basic fields.
 * 5. Switch to Member B by logging in as B.
 * 6. As Member B, attempt to update Member As membership request using the
 *    `membershipRequests.update` endpoint, changing joinMessage and answers.
 * 7. Assert that the update attempt fails (throws) using TestValidator.error.
 *
 * We do not verify updated content after the failure because the current
 * materials do not expose any get membership request by id endpoint, and the
 * update endpoint returns the updated entity only on success. It is sufficient
 * for this test to confirm that a non-owner cannot call update successfully.
 */
export async function test_api_membership_request_update_forbidden_for_other_users(
  connection: api.IConnection,
) {
  // 1. Arrange: create and authenticate a platform admin to create a
  //    visibility level for the community.
  const platformAdminJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const platformAdminJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: platformAdminJoinHref,
    referrer: platformAdminJoinReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Ensure we are authenticated as platformAdmin now (SDK sets Authorization).

  // 2. As platformAdmin, create a community visibility level that can be used
  //    when creating a community.
  const visibilityLevelCode = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevelCreateBody = {
    code: visibilityLevelCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create two member users: Member A (owner) and Member B (other member).

  // 3-1. Register Member A via auth.memberUser.join
  const memberAJoinBody = {
    username: `memberA_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuthorized);

  // Keep Member As credentials for later login if needed.
  const memberALoginIdentifier: string = memberAJoinBody.email;
  const memberAPassword: string = memberAJoinBody.password;

  // 3-2. Register Member B via auth.memberUser.join
  const memberBJoinBody = {
    username: `memberB_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberBAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuthorized);

  const memberBLoginIdentifier: string = memberBJoinBody.email;
  const memberBPassword: string = memberBJoinBody.password;

  // 4. As Member A, create a community that uses the created visibility level.
  //    SDK auth: call memberUser.login with Member As credentials to ensure
  //    Authorization header corresponds to Member A.

  const memberALoginBody = {
    identifier: memberALoginIdentifier,
    password: memberAPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberALoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALoginAuthorized);

  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. As Member A, create a membership request for that community.
  const membershipCreateBody = {
    questionKey: RandomGenerator.alphaNumeric(8),
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(membershipRequest);

  // 6. Switch to Member B and attempt to update Member As membership request.
  const memberBLoginBody = {
    identifier: memberBLoginIdentifier,
    password: memberBPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberBLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLoginAuthorized);

  // Prepare an update body that Member B will attempt to apply to Member As
  // request.
  const unauthorizedUpdateBody = {
    joinMessage: RandomGenerator.paragraph({ sentences: 2 }),
    answers: [
      {
        questionKey: membershipCreateBody.questionKey,
        answerText: RandomGenerator.paragraph({ sentences: 2 }),
      },
    ],
  } satisfies ICommunityPlatformCommunityMembershipRequest.IUpdate;

  // 7. Assert that Member B cannot update Member As membership request.
  await TestValidator.error(
    "member B must not be able to update member A's membership request",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.membershipRequests.update(
        connection,
        {
          communityIdentifier: community.identifier,
          membershipRequestId: membershipRequest.id,
          body: unauthorizedUpdateBody,
        },
      );
    },
  );
}
