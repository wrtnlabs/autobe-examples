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
 * Verify that a member user cannot delete a community membership from a
 * different community.
 *
 * Business context: A member user participates in multiple communities. Each
 * membership belongs to exactly one community, and destructive operations such
 * as membership deletion must be scoped by both the community identifier and
 * the membership identifier. Even if a caller knows a membershipId, they must
 * reference it under the correct communityIdentifier in the URL; otherwise, the
 * platform must reject the operation to prevent cross- community data leakage
 * or accidental deletions.
 *
 * This test constructs a realistic multi-actor workflow involving:
 *
 * - A platformAdmin who provisions a community visibility level.
 * - A memberUser who creates two communities using that visibility level.
 * - The same memberUser creating a membership request in the first community.
 * - An attempted membership deletion using the membershipId from the first
 *   community but the communityIdentifier of the second community.
 *
 * The core expectation is that the DELETE endpoint will throw an error when the
 * communityIdentifier and membershipId do not match, and that the SDK call will
 * not succeed silently.
 *
 * Steps:
 *
 * 1. Register and implicitly authenticate a memberUser via auth.memberUser.join.
 * 2. Register and implicitly authenticate a platformAdmin via
 *    auth.platformAdmin.join.
 * 3. As platformAdmin, create a visibility level via
 *    communityVisibilityLevels.create.
 * 4. Switch authentication back to the memberUser (via auth.memberUser.login) to
 *    perform memberUser-scoped operations.
 * 5. Create two separate communities (communityA and communityB) using the created
 *    visibility level code.
 * 6. For communityA, create a membership request via membershipRequests.create and
 *    capture its id as a stand-in membershipId.
 * 7. Invoke memberships.erase using communityIdentifier from communityB and the
 *    membershipId from communityA, wrapped in TestValidator.error to assert
 *    that the call fails.
 * 8. Confirm that the identifiers for communityA and communityB are different so
 *    the test scenario is valid (sanity check).
 */
export async function test_api_member_user_cannot_delete_membership_in_different_community(
  connection: api.IConnection,
) {
  // 1. Register a member user (join) and obtain authorized envelope
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Keep primary identifiers for later logins
  const memberIdentifier: string = memberAuthorized.email;
  const memberPassword: string = memberJoinBody.password;

  // 2. Register a platform admin
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As platformAdmin (already authenticated by join), create a visibility level
  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Switch back to memberUser context via login to ensure Authorization header uses member tokens
  const memberLoginBody = {
    identifier: memberIdentifier,
    password: memberPassword,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 5. Create two separate communities as the member user
  const communityAIdentifier = `comm-a-${RandomGenerator.alphaNumeric(6)}`;
  const communityACreateBody = {
    identifier: communityAIdentifier,
    title: `Community A ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityACreateBody,
      },
    );
  typia.assert(communityA);

  const communityBIdentifier = `comm-b-${RandomGenerator.alphaNumeric(6)}`;
  const communityBCreateBody = {
    identifier: communityBIdentifier,
    title: `Community B ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBCreateBody,
      },
    );
  typia.assert(communityB);

  // Sanity check: ensure the two communities have different identifiers
  await TestValidator.predicate(
    "community identifiers must differ for mismatch scenario",
    async () => communityA.identifier !== communityB.identifier,
  );

  // 6. For community A, create a membership request
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: communityA.identifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest);

  const membershipId: string = membershipRequest.id;

  // 7. Attempt to delete the membership using the second community's identifier
  await TestValidator.error(
    "cannot delete membership from a different community by mismatched identifier",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.memberships.erase(
        connection,
        {
          communityIdentifier: communityB.identifier,
          membershipId,
        },
      );
    },
  );
}
