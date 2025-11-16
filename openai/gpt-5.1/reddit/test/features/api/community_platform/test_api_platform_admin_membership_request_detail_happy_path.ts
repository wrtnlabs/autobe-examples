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

export async function test_api_platform_admin_membership_request_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (auto-authenticates via SDK)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphabets(10),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  // 2. As platform admin, create a visibility level
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  TestValidator.equals(
    "created visibility level code should match request body",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register a member user (auto-authenticates via SDK)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.alphabets(10),
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 4. As that member user, create a community using the created visibility level
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(10)}`;

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
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  TestValidator.equals(
    "community identifier should match creation payload",
    community.identifier,
    communityIdentifier,
  );

  TestValidator.equals(
    "community visibility level code should match created visibility level",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 5. As the same member, create a membership request for that community
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const createdMembershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier,
        body: membershipRequestBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembershipRequest>(
    createdMembershipRequest,
  );

  TestValidator.equals(
    "membership request community id should match created community id",
    createdMembershipRequest.community.id,
    community.id,
  );

  TestValidator.equals(
    "membership request requester id should match member user id",
    createdMembershipRequest.requesterMemberUser.id,
    memberAuthorized.id,
  );

  // Capture IDs for detail fetch and perform basic structural checks on new request
  const membershipRequestId = createdMembershipRequest.id;

  TestValidator.predicate(
    "new membership request status should be a non-empty string",
    createdMembershipRequest.status.length > 0,
  );

  TestValidator.predicate(
    "requestedAt should be a valid ISO date-time string",
    () => {
      const date = new Date(createdMembershipRequest.requestedAt);
      return !Number.isNaN(date.getTime());
    },
  );

  TestValidator.predicate(
    "createdAt should be a valid ISO date-time string",
    () => {
      const date = new Date(createdMembershipRequest.createdAt);
      return !Number.isNaN(date.getTime());
    },
  );

  TestValidator.predicate(
    "updatedAt should be a valid ISO date-time string",
    () => {
      const date = new Date(createdMembershipRequest.updatedAt);
      return !Number.isNaN(date.getTime());
    },
  );

  TestValidator.equals(
    "decidedAt should be null or undefined for freshly created request",
    createdMembershipRequest.decidedAt ?? null,
    null,
  );

  TestValidator.equals(
    "reviewerCommunityModerator should be null or undefined for freshly created request",
    createdMembershipRequest.reviewerCommunityModerator ?? null,
    null,
  );

  // 6. Switch back to platform admin context (login) to ensure actor is platformAdmin
  const platformAdminLoginBody = {
    identifier: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: platformAdminJoinBody.ip,
    href: platformAdminJoinBody.href,
    referrer: platformAdminJoinBody.referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminLoggedIn,
  );

  TestValidator.equals(
    "logged-in platform admin id should match joined platform admin id",
    platformAdminLoggedIn.id,
    platformAdminAuthorized.id,
  );

  // 7. As platform admin, fetch membership request detail via platformAdmin endpoint
  const fetchedMembershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.platformAdmin.communities.membershipRequests.at(
      connection,
      {
        communityIdentifier,
        membershipRequestId,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembershipRequest>(
    fetchedMembershipRequest,
  );

  // Validate that the fetched request matches the one created
  TestValidator.equals(
    "fetched membership request id should match created one",
    fetchedMembershipRequest.id,
    createdMembershipRequest.id,
  );

  TestValidator.equals(
    "fetched membership request community id should match created community id",
    fetchedMembershipRequest.community.id,
    community.id,
  );

  TestValidator.equals(
    "fetched membership request requester id should match member user id",
    fetchedMembershipRequest.requesterMemberUser.id,
    memberAuthorized.id,
  );

  TestValidator.equals(
    "fetched membership request status should match created request status",
    fetchedMembershipRequest.status,
    createdMembershipRequest.status,
  );

  TestValidator.equals(
    "fetched membership request requestedAt should match created requestedAt",
    fetchedMembershipRequest.requestedAt,
    createdMembershipRequest.requestedAt,
  );

  // Confirm that platform admin access does not depend on moderator assignments
  TestValidator.predicate(
    "platform admin can access membership request detail without moderator assignment",
    fetchedMembershipRequest.community.id === community.id &&
      fetchedMembershipRequest.requesterMemberUser.id === memberAuthorized.id,
  );
}
