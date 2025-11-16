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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembershipRequest";

/**
 * Validate that a community moderator can list membership requests for a
 * specific community using default (minimal) filters.
 *
 * Business flow:
 *
 * 1. Platform admin joins the platform.
 * 2. Platform admin creates a visibility level (e.g., code "public").
 * 3. Member user joins.
 * 4. Member user creates a community referencing that visibility level.
 * 5. Community moderator joins.
 * 6. Member user creates a membership request for the community.
 * 7. Community moderator lists membership requests for that community with minimal
 *    filters.
 *
 * Assertions:
 *
 * - Listing result has at least one element.
 * - At least one summary item matches the created membership request (id and
 *   requester.id).
 * - All returned summaries reference the expected community.
 * - The status in the summary for the created request matches the status of the
 *   created entity.
 */
export async function test_api_moderator_membership_requests_listing_basic_flow(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a visibility level
  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);
  TestValidator.equals(
    "visibility level code should match",
    visibility.code,
    visibilityCode,
  );

  // 3. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member user creates a community
  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
  typia.assert(community);
  TestValidator.equals(
    "community identifier should match",
    community.identifier,
    communityIdentifier,
  );

  // 5. Community moderator joins
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 6. Member user creates a membership request for the community
  // (Implicit: we still use the same connection which now has moderator's token,
  // but we need member user's context. Since SDK overwrites Authorization on each auth call,
  // we must log in again as memberUser before creating the membership request.)

  // Login again as member user
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  const membershipCreateBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(membershipRequest);

  // 7. Switch to community moderator account for listing
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://mod.example.com/login",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  // 8. Moderator lists membership requests with minimal filters (all undefined)
  const listRequestBody =
    {} satisfies ICommunityPlatformCommunityMembershipRequest.IRequest;

  const page: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.membershipRequests.index(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: listRequestBody,
      },
    );
  typia.assert(page);

  // Basic assertions on pagination and data presence
  TestValidator.predicate(
    "membership requests list should contain at least one item",
    page.data.length > 0,
  );

  // Find the created membership request in the result set by id
  const matched = page.data.find((item) => item.id === membershipRequest.id);

  TestValidator.predicate(
    "created membership request should be present in moderator listing",
    matched !== undefined,
  );

  if (!matched) return;

  // Validate that the community of all items matches the created community id
  for (const item of page.data) {
    TestValidator.equals(
      "all membership request summaries should belong to the expected community",
      item.community.id,
      community.id,
    );
  }

  // Validate requester linkage for the matched item
  TestValidator.equals(
    "requester id in summary should match membership request requester id",
    matched.requester.id,
    membershipRequest.requesterMemberUser.id,
  );

  // Validate status alignment (if status is present in both detailed and summary forms)
  TestValidator.equals(
    "status in summary should match detailed membership request status",
    matched.status,
    membershipRequest.status,
  );
}
