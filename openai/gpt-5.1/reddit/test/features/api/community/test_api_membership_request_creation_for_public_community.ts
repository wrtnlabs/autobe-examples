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
 * Validate creation of a community membership request for a public community.
 *
 * Business flow covered by this test:
 *
 * 1. Register a member user (memberUser actor) and obtain authentication.
 * 2. Register a platform administrator and create a community visibility level.
 * 3. Switch back to the member user and create a community using that visibility
 *    level.
 * 4. As the same member user, create a membership request for that community.
 * 5. Assert that the membership request is linked to the correct community and
 *    requester, has a `pending` status, and has populated request and audit
 *    timestamps.
 * 6. Optionally verify that attempting to create a duplicate pending request
 *    results in an error according to business rules.
 */
export async function test_api_membership_request_creation_for_public_community(
  connection: api.IConnection,
) {
  // 1. Register a member user (self-join) and authenticate
  const memberJoinEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberJoinPassword: string = "P@ssw0rd!";

  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: memberJoinEmail,
    password: memberJoinPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register a platform admin and create a visibility level
  const adminJoinEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinPassword: string = "AdminP@ssw0rd!";

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: adminJoinEmail,
    password: adminJoinPassword,
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Create a visibility level as platformAdmin
  const visibilityCode: string = `public_${RandomGenerator.alphaNumeric(8)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
    "created visibility level code should match requested code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Switch back to member user context using login
  const memberLoginBody = {
    identifier: memberJoinEmail,
    password: memberJoinPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedAgain);

  TestValidator.equals(
    "member user id should be consistent across join and login",
    memberAuthorizedAgain.id,
    memberAuthorized.id,
  );

  // 4. Create a community as the member user
  const communityIdentifier: string = `public-community-${RandomGenerator.alphaNumeric(6)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    visibilityLevelCode: visibilityCode,
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

  TestValidator.equals(
    "created community identifier should match requested identifier",
    community.identifier,
    communityIdentifier,
  );

  // 5. Create a membership request for the community as the same member user
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest);

  // 6. Business assertions on the created membership request
  TestValidator.predicate(
    "membership request community id should not be empty",
    membershipRequest.community.id.length > 0,
  );

  TestValidator.equals(
    "membership request requester should match authenticated member user",
    membershipRequest.requesterMemberUser.id,
    memberAuthorizedAgain.id,
  );

  TestValidator.equals(
    "new membership request should have pending status",
    membershipRequest.status,
    "pending",
  );

  TestValidator.predicate(
    "membership request should have a requestedAt timestamp",
    membershipRequest.requestedAt.length > 0,
  );

  TestValidator.predicate(
    "membership request should have a createdAt timestamp",
    membershipRequest.createdAt.length > 0,
  );

  TestValidator.predicate(
    "membership request should have an updatedAt timestamp",
    membershipRequest.updatedAt.length > 0,
  );

  // 7. Optional: verify that duplicate pending membership request is rejected
  await TestValidator.error(
    "duplicate pending membership request for same community should fail",
    async () => {
      const duplicateBody = {
        questionKey: "why_join",
        answerText: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

      await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
        connection,
        {
          communityIdentifier: community.identifier,
          body: duplicateBody,
        },
      );
    },
  );
}
