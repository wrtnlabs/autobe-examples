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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";

export async function test_api_member_membership_index_includes_deleted_when_requested(
  connection: api.IConnection,
) {
  // 1. Register a member user (join) and keep credentials for later login
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123!";
  const memberHref: string = "https://member.example.com/join";
  const memberReferrer: string = "https://member.example.com/landing";

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 2. Register a platform admin who can create visibility levels
  const adminUsername: string = RandomGenerator.name(1);
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const adminHref: string = "https://admin.example.com/join";
  const adminReferrer: string = "https://admin.example.com/landing";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: adminHref,
    referrer: adminReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As platformAdmin (already authenticated by join), create a visibility level
  const visibilityCode: string = `vl_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityName: string = `Visibility ${RandomGenerator.name(1)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: visibilityName,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 4. Switch back to memberUser context by logging in
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 5. As memberUser, create at least two communities referencing the visibility level
  const communityCount = 2;
  const communities: ICommunityPlatformCommunity[] = [];

  for (let i = 0; i < communityCount; i += 1) {
    const identifier = `community_${RandomGenerator.alphaNumeric(10)}`;
    const title = `Community ${RandomGenerator.name(2)}`;
    const description = RandomGenerator.paragraph({ sentences: 5 });

    const communityCreateBody = {
      identifier,
      title,
      description,
      visibilityLevelCode: visibilityCode,
      isNsfw: false,
      primaryTagIds: undefined,
    } satisfies ICommunityPlatformCommunity.ICreate;

    const community: ICommunityPlatformCommunity =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        { body: communityCreateBody },
      );
    typia.assert(community);
    communities.push(community);
  }

  // 6. For each community, create at least one membership request
  const membershipRequests: ICommunityPlatformCommunityMembershipRequest[] = [];

  for (const community of communities) {
    const membershipRequestBody = {
      questionKey: "why_join",
      answerText: RandomGenerator.paragraph({ sentences: 2 }),
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
    membershipRequests.push(membershipRequest);
  }

  // 7. List memberships for the member user with include_deleted = true
  const requestWithDeleted = {
    is_active: undefined,
    joined_from: null,
    joined_to: null,
    ended_from: null,
    ended_to: null,
    include_deleted: true,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "joined_at" as const,
    sort_direction: "desc" as const,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const pageWithDeleted: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.memberUser.memberUsers.communityMemberships.index(
      connection,
      {
        memberUserId: memberUserId,
        body: requestWithDeleted,
      },
    );
  typia.assert(pageWithDeleted);

  // Basic pagination sanity checks for include_deleted=true
  TestValidator.equals(
    "current page is 1 when include_deleted is true",
    pageWithDeleted.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches requested when include_deleted is true",
    pageWithDeleted.pagination.limit,
    requestWithDeleted.limit,
  );
  TestValidator.predicate(
    "data length does not exceed limit when include_deleted is true",
    pageWithDeleted.data.length <= pageWithDeleted.pagination.limit,
  );

  // 8. List memberships for the same member user with include_deleted omitted/false
  const requestActiveOnly = {
    is_active: undefined,
    joined_from: null,
    joined_to: null,
    ended_from: null,
    ended_to: null,
    // include_deleted intentionally omitted for default behavior
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "joined_at" as const,
    sort_direction: "desc" as const,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const pageActiveOnly: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.memberUser.memberUsers.communityMemberships.index(
      connection,
      {
        memberUserId: memberUserId,
        body: requestActiveOnly,
      },
    );
  typia.assert(pageActiveOnly);

  // Basic pagination sanity checks for include_deleted=false/default
  TestValidator.equals(
    "current page is 1 when include_deleted is false/default",
    pageActiveOnly.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches requested when include_deleted is false/default",
    pageActiveOnly.pagination.limit,
    requestActiveOnly.limit,
  );
  TestValidator.predicate(
    "data length does not exceed limit when include_deleted is false/default",
    pageActiveOnly.data.length <= pageActiveOnly.pagination.limit,
  );

  // 9. Ensure that active-only memberships are a subset of include_deleted=true memberships
  const withDeletedIds = new Set(pageWithDeleted.data.map((m) => m.id));

  for (const membership of pageActiveOnly.data) {
    TestValidator.predicate(
      "every membership from active-only listing exists in include_deleted=true listing",
      withDeletedIds.has(membership.id),
    );
  }

  // 10. Validate pagination monotonicity on record counts
  TestValidator.predicate(
    "records with include_deleted=true is greater than or equal to records with include_deleted=false/default",
    pageWithDeleted.pagination.records >= pageActiveOnly.pagination.records,
  );

  TestValidator.predicate(
    "pages with include_deleted=true is greater than or equal to pages with include_deleted=false/default",
    pageWithDeleted.pagination.pages >= pageActiveOnly.pagination.pages,
  );
}
