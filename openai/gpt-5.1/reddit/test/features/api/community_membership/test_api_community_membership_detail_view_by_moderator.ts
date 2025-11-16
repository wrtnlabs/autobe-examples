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

export async function test_api_community_membership_detail_view_by_moderator(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and authenticates
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates a visibility level master record
  const visibilityLevelCreateBody = {
    code: `public-${RandomGenerator.alphabets(6)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Member user joins and authenticates
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member user creates a community using the created visibility level
  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
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
    "community identifier should match input",
    community.identifier,
    communityIdentifier,
  );

  // 5. Member user submits a membership request for the community
  const membershipRequestCreateBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestCreateBody,
      },
    );
  typia.assert(membershipRequest);

  TestValidator.equals(
    "membership request community id matches community",
    membershipRequest.community.id,
    community.id,
  );

  TestValidator.equals(
    "membership request requester id matches member user id",
    membershipRequest.requesterMemberUser.id,
    memberAuthorized.id,
  );

  // 6. Community moderator joins and authenticates
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@moderator.example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/register",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 7. Moderator creates a community membership for the member user
  const membershipCreateBody = {
    memberuser_id: memberAuthorized.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const createdMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(createdMembership);

  TestValidator.equals(
    "created membership belongs to expected community",
    createdMembership.community.id,
    community.id,
  );

  TestValidator.equals(
    "created membership member id matches member user id",
    createdMembership.memberuser.id,
    memberAuthorized.id,
  );

  TestValidator.predicate(
    "created membership is active",
    createdMembership.is_active === true,
  );

  TestValidator.predicate(
    "created membership has non-null joined_at",
    createdMembership.joined_at !== null &&
      createdMembership.joined_at !== undefined,
  );

  TestValidator.predicate(
    "created membership has non-null created_at",
    createdMembership.created_at !== null &&
      createdMembership.created_at !== undefined,
  );

  TestValidator.predicate(
    "created membership ended_at is null",
    createdMembership.ended_at === null ||
      createdMembership.ended_at === undefined,
  );

  TestValidator.predicate(
    "created membership deleted_at is null",
    createdMembership.deleted_at === null ||
      createdMembership.deleted_at === undefined,
  );

  // 8. Moderator fetches membership detail via GET endpoint
  const fetchedOnce: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.at(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId: createdMembership.id,
      },
    );
  typia.assert(fetchedOnce);

  TestValidator.equals(
    "fetched membership id matches created id",
    fetchedOnce.id,
    createdMembership.id,
  );

  TestValidator.equals(
    "fetched membership community id matches created community id",
    fetchedOnce.community.id,
    createdMembership.community.id,
  );

  TestValidator.equals(
    "fetched membership memberuser id matches created membership memberuser id",
    fetchedOnce.memberuser.id,
    createdMembership.memberuser.id,
  );

  TestValidator.predicate(
    "fetched membership is_active remains true",
    fetchedOnce.is_active === true,
  );

  TestValidator.equals(
    "joined_at is stable between create and fetch",
    fetchedOnce.joined_at,
    createdMembership.joined_at,
  );

  TestValidator.equals(
    "created_at is stable between create and fetch",
    fetchedOnce.created_at,
    createdMembership.created_at,
  );

  TestValidator.predicate(
    "fetched membership ended_at is still null",
    fetchedOnce.ended_at === null || fetchedOnce.ended_at === undefined,
  );

  TestValidator.predicate(
    "fetched membership deleted_at is still null",
    fetchedOnce.deleted_at === null || fetchedOnce.deleted_at === undefined,
  );

  // 9. Idempotency check: repeated GET calls return consistent data
  const repeatCount = 3;
  const repeatedFetches: ICommunityPlatformCommunityMembership[] =
    await ArrayUtil.asyncRepeat(repeatCount, async () => {
      const result =
        await api.functional.communityPlatform.communityModerator.communities.memberships.at(
          connection,
          {
            communityIdentifier: community.identifier,
            membershipId: createdMembership.id,
          },
        );
      typia.assert(result);
      return result;
    });

  for (let i = 0; i < repeatedFetches.length; i += 1) {
    const fetched = repeatedFetches[i];

    TestValidator.equals(
      `idempotent fetch #${i + 1} membership equality`,
      fetched,
      fetchedOnce,
    );

    TestValidator.equals(
      `idempotent fetch #${i + 1} membership id stability`,
      fetched.id,
      createdMembership.id,
    );

    TestValidator.predicate(
      `idempotent fetch #${i + 1} is_active remains true`,
      fetched.is_active === true,
    );
  }
}
