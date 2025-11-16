import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";

export async function test_api_community_subscribers_index_filtered_by_role_and_status(
  connection: api.IConnection,
) {
  // 1. Register a memberUser to obtain an authenticated session
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a new community as this memberUser
  const communityBody = {
    slug: `${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Call subscribers.index with role/status filters
  const requestBody = {
    page: 1,
    pageSize: 100,
    roles: ["moderator", "owner"],
    statuses: ["active"],
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const pageResult: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.communities.subscribers.index(
      connection,
      {
        communityId: community.id,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  const records = pageResult.data;

  // 4. Basic pagination checks
  TestValidator.predicate(
    "pagination.limit should be between 0 and 100",
    pagination.limit >= 0 && pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination.records must be >= data length",
    pagination.records >= records.length,
  );
  TestValidator.predicate(
    "pagination.pages must be >= 0",
    pagination.pages >= 0,
  );

  // 5. Validate each membership summary against role/status filters and nested summaries
  for (const membership of records) {
    typia.assert<ICommunityPlatformCommunityMembership.ISummary>(membership);

    // role must be in ["moderator", "owner"]
    TestValidator.predicate(
      "membership role must be moderator or owner",
      membership.role === "moderator" || membership.role === "owner",
    );

    // Interpret "active" as approved and not banned
    TestValidator.predicate(
      "membership must be approved when filtering by active status",
      membership.isApproved === true,
    );
    TestValidator.predicate(
      "membership must not be banned when filtering by active status",
      membership.isBanned === false,
    );

    // Community summary consistency
    typia.assert(membership.community);
    TestValidator.equals(
      "membership.community.id must equal created community id",
      membership.community.id,
      community.id,
    );
    TestValidator.predicate(
      "membership.community.slug must be non-empty string",
      typeof membership.community.slug === "string" &&
        membership.community.slug.length > 0,
    );
    TestValidator.predicate(
      "membership.community.name must be non-empty string",
      typeof membership.community.name === "string" &&
        membership.community.name.length > 0,
    );

    // memberUser summary consistency
    typia.assert(membership.memberUser);
    TestValidator.predicate(
      "memberUser.id must be a non-empty string",
      typeof membership.memberUser.id === "string" &&
        membership.memberUser.id.length > 0,
    );
    TestValidator.predicate(
      "memberUser.username must be non-empty string",
      typeof membership.memberUser.username === "string" &&
        membership.memberUser.username.length > 0,
    );

    // Optional fields: displayName, avatarUrl, karmaScore - just assert types when present
    if (membership.memberUser.displayName !== undefined) {
      TestValidator.predicate(
        "memberUser.displayName, when present, must be string",
        typeof membership.memberUser.displayName === "string",
      );
    }
    if (membership.memberUser.avatarUrl !== undefined) {
      TestValidator.predicate(
        "memberUser.avatarUrl, when present, must be string",
        typeof membership.memberUser.avatarUrl === "string",
      );
    }
    if (membership.memberUser.karmaScore !== undefined) {
      TestValidator.predicate(
        "memberUser.karmaScore, when present, must be a non-negative number",
        typeof membership.memberUser.karmaScore === "number" &&
          membership.memberUser.karmaScore >= 0,
      );
    }
  }

  // 6. Ensure no violating memberships (redundant but explicit for clarity)
  const hasViolatingRole = records.some(
    (m) => m.role !== "moderator" && m.role !== "owner",
  );
  TestValidator.predicate(
    "no membership should have a role outside moderator/owner when filtered",
    hasViolatingRole === false,
  );

  const hasViolatingStatus = records.some(
    (m) => m.isApproved !== true || m.isBanned !== false,
  );
  TestValidator.predicate(
    "no membership should violate active status interpretation",
    hasViolatingStatus === false,
  );
}
