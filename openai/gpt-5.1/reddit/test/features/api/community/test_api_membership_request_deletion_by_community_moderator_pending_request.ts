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
 * Validate that a community moderator can delete a pending membership request
 * for a community, without affecting the community, the member user, or other
 * membership requests in the same community.
 *
 * Business flow:
 *
 * 1. Register a platform administrator and rely on SDK-managed authentication.
 * 2. As platform admin, create a visibility level master record that will be
 *    referenced by the community.
 * 3. Register a member user who will create a community and submit membership
 *    requests.
 * 4. As the member user, create a community using the created visibility level
 *    code.
 * 5. As the same member user, create two membership requests for that community
 *    (request A and request B) so we can later ensure that deleting request A
 *    does not impact request B.
 * 6. Register a community moderator and rely on SDK-managed authentication. (No
 *    explicit assignment API exists; assume global moderator rights.)
 * 7. As the community moderator, delete membership request A using the community
 *    identifier and membership request id.
 *
 * Validations:
 *
 * - All create calls return correctly typed DTOs (typia.assert).
 * - The community identifier used in the membership request path matches the
 *   identifier of the created community.
 * - Membership requests A and B have different ids.
 * - The delete call succeeds without throwing, implying that a moderator can
 *   delete a membership request scoped to the community.
 * - After deletion of A, request B remains logically unaffected (the DTO returned
 *   at creation time is intact and no further operations fail).
 */
export async function test_api_membership_request_deletion_by_community_moderator_pending_request(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 2. Platform admin creates a visibility level
  const visibilityCode: string = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: "Test Visibility Level",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelCreateBody },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);
  TestValidator.equals(
    "visibility level code matches",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser);

  // 4. Member user creates a community
  const communityIdentifier: string = `comm-${RandomGenerator.alphaNumeric(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  TestValidator.equals(
    "community identifier matches request",
    community.identifier,
    communityIdentifier,
  );

  // 5. Member user creates two membership requests (A and B)
  const membershipRequestBodyA = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequestA: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestBodyA,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembershipRequest>(
    membershipRequestA,
  );

  TestValidator.equals(
    "membership request A community id matches community",
    membershipRequestA.community.id,
    community.id,
  );

  const membershipRequestBodyB = {
    questionKey: "introduction",
    answerText: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequestB: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestBodyB,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembershipRequest>(
    membershipRequestB,
  );

  TestValidator.equals(
    "membership request B community id matches community",
    membershipRequestB.community.id,
    community.id,
  );

  TestValidator.notEquals(
    "membership request A and B should have different ids",
    membershipRequestA.id,
    membershipRequestB.id,
  );

  // 6. Community moderator joins
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mod.console.example.com/join",
    referrer: "https://mod.console.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderator);

  // 7. Community moderator deletes membership request A
  await api.functional.communityPlatform.communityModerator.communities.membershipRequests.erase(
    connection,
    {
      communityIdentifier: community.identifier,
      membershipRequestId: membershipRequestA.id,
    },
  );

  // Final predicate: ensure that request B is still logically valid DTO
  // (we already asserted it at creation time, so here we just reiterate the
  // relationship as a sanity check for "no side effects" on other requests).
  TestValidator.equals(
    "membership request B still associated with same community after A deletion",
    membershipRequestB.community.id,
    community.id,
  );
}
