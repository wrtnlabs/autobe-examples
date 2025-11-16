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

export async function test_api_membership_request_update_pending_by_owner(
  connection: api.IConnection,
) {
  // 1. Create a platform admin and a community visibility level to be used by communities
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public visibility for tests",
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

  // 2. Register a member user (this user will own the community and membership request)
  const memberUsername = RandomGenerator.name(1);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://app.example.com/member/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As the member user, create a community referencing the created visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
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
    "community identifier should match creation payload",
    community.identifier,
    communityIdentifier,
  );

  // 4. As the same member user, create an initial membership request for that community
  const initialJoinMessage = RandomGenerator.paragraph({ sentences: 5 });
  const initialAnswers: ICommunityPlatformCommunityMembershipRequest.ICreate[] =
    [
      {
        questionKey: "reason_to_join",
        answerText: RandomGenerator.paragraph({ sentences: 3 }),
      },
      {
        questionKey: "experience_level",
        answerText: RandomGenerator.paragraph({ sentences: 2 }),
      },
    ];

  const initialRequestBody = {
    questionKey: initialAnswers[0].questionKey,
    answerText: initialAnswers[0].answerText,
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const initialRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: initialRequestBody,
      },
    );
  typia.assert(initialRequest);

  TestValidator.equals(
    "membership request community id should match community",
    initialRequest.community.id,
    community.id,
  );

  // 5. While the request is still pending, call update with new joinMessage and modified answers
  const updatedJoinMessage = RandomGenerator.paragraph({ sentences: 4 });
  const updatedAnswers: ICommunityPlatformCommunityMembershipRequest.ICreate[] =
    [
      {
        questionKey: "reason_to_join",
        answerText: RandomGenerator.paragraph({ sentences: 4 }),
      },
      {
        questionKey: "experience_level",
        answerText: RandomGenerator.paragraph({ sentences: 3 }),
      },
    ];

  const updateBody = {
    joinMessage: updatedJoinMessage,
    answers: updatedAnswers,
  } satisfies ICommunityPlatformCommunityMembershipRequest.IUpdate;

  const updatedRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.update(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipRequestId: initialRequest.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRequest);

  // 6. Validate immutable and mutable fields
  TestValidator.equals(
    "membership request id should remain unchanged",
    updatedRequest.id,
    initialRequest.id,
  );

  TestValidator.equals(
    "membership request community should remain the same",
    updatedRequest.community.id,
    initialRequest.community.id,
  );

  TestValidator.equals(
    "requester member user should remain the same",
    updatedRequest.requesterMemberUser.id,
    initialRequest.requesterMemberUser.id,
  );

  TestValidator.equals(
    "status should remain unchanged (e.g., pending)",
    updatedRequest.status,
    initialRequest.status,
  );

  TestValidator.notEquals(
    "updatedAt should change after update",
    updatedRequest.updatedAt,
    initialRequest.updatedAt,
  );
}
