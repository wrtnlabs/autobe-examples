import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";

/**
 * Verify that community moderators can control inclusion of soft-deleted
 * memberships when searching, using the include_deleted flag.
 *
 * Business flow:
 *
 * 1. Platform admin joins and creates a community visibility level.
 * 2. Member user joins and creates a community using that visibility level.
 * 3. Community moderator joins.
 * 4. Moderator creates multiple memberships for the community (for multiple member
 *    users).
 * 5. Moderator soft-deletes one membership via erase endpoint.
 * 6. Moderator searches memberships with include_deleted omitted/false and
 *    confirms the deleted membership is excluded.
 * 7. Moderator searches again with include_deleted=true and confirms the deleted
 *    membership is included and pagination metadata reflects the extra row.
 */
export async function test_api_community_membership_search_including_soft_deleted_records(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and creates a visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevelBody = {
    code: visibilityCode,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelBody },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "created visibility level code matches request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 2. Member user joins and creates a community
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier matches creation request",
    community.identifier,
    communityCreateBody.identifier,
  );

  const communityIdentifier: string = community.identifier;

  // 3. Community moderator joins
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 4. Create multiple member users and memberships
  const extraMember1JoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const extraMember1: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: extraMember1JoinBody,
    });
  typia.assert(extraMember1);

  const extraMember2JoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const extraMember2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: extraMember2JoinBody,
    });
  typia.assert(extraMember2);

  const membershipBodies = [
    {
      memberuser_id: memberAuthorized.id,
      is_active: true,
    },
    {
      memberuser_id: extraMember1.id,
      is_active: true,
    },
    {
      memberuser_id: extraMember2.id,
      is_active: true,
    },
  ] satisfies ICommunityPlatformCommunityMembership.ICreate[];

  const createdMemberships: ICommunityPlatformCommunityMembership[] = [];

  for (const body of membershipBodies) {
    const membership =
      await api.functional.communityPlatform.communityModerator.communities.memberships.create(
        connection,
        {
          communityIdentifier,
          body,
        },
      );
    typia.assert(membership);
    createdMemberships.push(membership);
  }

  TestValidator.equals(
    "three memberships should have been created",
    createdMemberships.length,
    membershipBodies.length,
  );

  // 5. Soft-delete one membership (simulate soft delete via erase)
  const deletedMembership: ICommunityPlatformCommunityMembership =
    createdMemberships[0];

  await api.functional.communityPlatform.communityModerator.communities.memberships.erase(
    connection,
    {
      communityIdentifier,
      membershipId: deletedMembership.id,
    },
  );

  // 6. Search with include_deleted omitted (default false)
  const searchWithoutDeletedBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const pageWithoutDeleted: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.memberships.index(
      connection,
      {
        communityIdentifier,
        body: searchWithoutDeletedBody,
      },
    );
  typia.assert(pageWithoutDeleted);

  // Confirm deleted membership is NOT present
  const idsWithoutDeleted = pageWithoutDeleted.data.map((m) => m.id);
  TestValidator.predicate(
    "soft-deleted membership id should not appear when include_deleted is omitted",
    idsWithoutDeleted.includes(deletedMembership.id) === false,
  );

  // 7. Search with include_deleted = true
  const searchWithDeletedBody = {
    include_deleted: true,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const pageWithDeleted: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.memberships.index(
      connection,
      {
        communityIdentifier,
        body: searchWithDeletedBody,
      },
    );
  typia.assert(pageWithDeleted);

  const idsWithDeleted = pageWithDeleted.data.map((m) => m.id);

  TestValidator.predicate(
    "soft-deleted membership id should appear when include_deleted is true",
    idsWithDeleted.includes(deletedMembership.id),
  );

  // Count expectations: with include_deleted should be >= without
  TestValidator.predicate(
    "pagination.records with include_deleted should be greater or equal",
    pageWithDeleted.pagination.records >= pageWithoutDeleted.pagination.records,
  );

  // Ensure that non-deleted memberships are present in both responses
  const nonDeletedIds = createdMemberships.slice(1).map((m) => m.id);

  for (const id of nonDeletedIds) {
    TestValidator.predicate(
      "non-deleted membership should be present regardless of include_deleted flag (without)",
      idsWithoutDeleted.includes(id),
    );
    TestValidator.predicate(
      "non-deleted membership should be present regardless of include_deleted flag (with)",
      idsWithDeleted.includes(id),
    );
  }

  // Basic assertions on pagination and summary structure
  TestValidator.equals(
    "current page should be 1 when requesting page 1 (without deleted)",
    pageWithoutDeleted.pagination.current,
    1,
  );
  TestValidator.equals(
    "current page should be 1 when requesting page 1 (with deleted)",
    pageWithDeleted.pagination.current,
    1,
  );

  TestValidator.predicate(
    "data length should not exceed limit (without deleted)",
    pageWithoutDeleted.data.length <= searchWithoutDeletedBody.limit!,
  );
  TestValidator.predicate(
    "data length should not exceed limit (with deleted)",
    pageWithDeleted.data.length <= searchWithDeletedBody.limit!,
  );

  // Ensure each summary has required fields populated
  for (const summary of pageWithDeleted.data) {
    typia.assert<ICommunityPlatformCommunityMembership.ISummary>(summary);
    TestValidator.predicate(
      "membership summary must have a non-empty status",
      summary.status.length > 0,
    );
  }
}
