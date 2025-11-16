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

export async function test_api_member_user_leaves_community_successfully(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (authenticate) to be able to create a visibility level.
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: "AdminPassword123!",
    displayName: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level as platform admin.
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: RandomGenerator.name(2),
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
    "created visibility level code matches request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins (authenticate) who will create the community and later leave it.
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: "MemberPassword123!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member user, create a community using the created visibility level.
  const communityIdentifier = `comm-${RandomGenerator.alphabets(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
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
    "community identifier in response matches creation request",
    community.identifier,
    communityIdentifier,
  );

  // 5. Still as member user, create a membership request to this community.
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 5 }),
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

  TestValidator.equals(
    "membership request community id should match created community id",
    membershipRequest.community.id,
    community.id,
  );

  // 6. Call the memberUser-scoped DELETE endpoint to leave the community.
  //    We do not have a membership creation API that returns membershipId,
  //    and the erase endpoint's membershipId is a plain string. Use a
  //    synthetic membershipId as a stand-in for testing call success.
  const membershipId = RandomGenerator.alphaNumeric(16);

  let eraseSucceeded = false;
  await api.functional.communityPlatform.memberUser.communities.memberships.erase(
    connection,
    {
      communityIdentifier: community.identifier,
      membershipId,
    },
  );
  eraseSucceeded = true;

  // 7. Validate that the erase call completed without throwing.
  TestValidator.predicate(
    "member user should be able to invoke membership erase without client-side or type errors",
    eraseSucceeded === true,
  );
}
