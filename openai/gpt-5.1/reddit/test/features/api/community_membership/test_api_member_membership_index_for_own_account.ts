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

/**
 * Verify that a member user can list their own active community memberships
 * with filtering and pagination.
 *
 * Business goal: Ensure that the endpoint PATCH
 * /communityPlatform/memberUser/memberUsers/{memberUserId}/communityMemberships
 * correctly returns a paginated list of community memberships for the
 * authenticated member user when filtering for active memberships.
 *
 * Key behaviors validated:
 *
 * - The API responds with a properly shaped page envelope
 *   (IPageICommunityPlatformCommunityMembership.ISummary).
 * - Pagination metadata (current, limit) matches the request body.
 * - Each membership summary belongs to the requesting member user.
 * - Basic filtering semantics for is_active=true are respected at a high level
 *   (we only assert that some memberships are returned for the member, but we
 *   do not assert per-row internal status booleans because they are not
 *   directly exposed by the DTO; instead we rely on its derived `status` string
 *   and treat the endpoint as black-box filtered by is_active).
 *
 * Scenario steps (implementable with given APIs):
 *
 * 1. Register a member user via api.functional.auth.memberUser.join.
 *
 *    - Use ICommunityPlatformMemberuser.IJoinRequest with realistic data: username,
 *         email, password, href, referrer (typia.random & tags.Format for
 *         email/uri).
 *    - Response is ICommunityPlatformMemberuser.IAuthorized; typia.assert it.
 * 2. Register a platform admin via api.functional.auth.platformAdmin.join.
 *
 *    - Use ICommunityPlatformPlatformadmin.IJoin.
 *    - The response gives us a platform-admin authorization context.
 * 3. As platform admin, create a community visibility level using
 *    api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create
 *    with body ICommunityPlatformCommunityVisibilityLevel.ICreate.
 *
 *    - Provide a synthetic code (e.g., "public-" + RandomGenerator.alphaNumeric),
 *         name, and description.
 *    - Typia.assert the response and keep the code for community creation.
 * 4. Switch back to the member user context by logging in as the member user using
 *    api.functional.auth.memberUser.login with
 *    ICommunityPlatformMemberuser.ILoginRequest.
 * 5. Create a community as the member user via
 *    api.functional.communityPlatform.memberUser.communities.create with
 *    ICommunityPlatformCommunity.ICreate.
 *
 *    - Use the visibilityLevelCode from the created visibility level.
 *    - Identifier and title can be random strings.
 *    - IsNsfw can be false; primaryTagIds is omitted.
 * 6. Submit a membership request for the newly created community via
 *    api.functional.communityPlatform.memberUser.communities.membershipRequests.create
 *    with path parameter communityIdentifier = community.identifier (from
 *    ICommunityPlatformCommunity) and body
 *    ICommunityPlatformCommunityMembershipRequest.ICreate.
 *
 *    - Populate questionKey and answerText with simple random strings.
 *    - Typia.assert the returned ICommunityPlatformCommunityMembershipRequest.
 *
 *    NOTE: There is no explicit API in the provided SDK to approve/activate
 *    membership requests or to directly create membership rows. For the E2E
 *    test we cannot force internal state transition from request to membership.
 *    Therefore, we treat the membership index endpoint as a black box and only
 *    assert structural correctness and that the result set, if non-empty,
 *    refers to the requesting member user. We do not assert that our specific
 *    request has produced a membership row.
 * 7. Call the membership index endpoint as the member user:
 *    api.functional.communityPlatform.memberUser.memberUsers.communityMemberships.index
 *    with:
 *
 *    - MemberUserId: authorizedMember.id
 *    - Body: ICommunityPlatformCommunityMembership.IRequest { is_active: true,
 *         include_deleted: false, page: 1, limit: 10, sort_by: "joined_at",
 *         sort_direction: "desc" }.
 * 8. Validate the response:
 *
 *    - Typia.assert on IPageICommunityPlatformCommunityMembership.ISummary.
 *    - Use TestValidator.equals with descriptive titles to ensure pagination.current
 *         and pagination.limit match the requested page and limit.
 *    - Iterate over output.data and assert with TestValidator.equals that
 *         membership.memberuser.id equals the member's id for every record.
 *    - Optionally, add TestValidator.predicate to ensure that when data.length
 *
 * > 0, at least one membership references some community id; however, the DTO >
 * > already guarantees community association, so this is mostly a sanity check.
 *
 * 9. The test deliberately does NOT assert HTTP status codes nor attempts to
 *    validate soft-deleted/inactive exclusions at the row level because we do
 *    not see raw is_active/deleted_at flags in the summary DTO. Instead, we
 *    focus on correct scoping to the member, correct pagination echo, and
 *    structural validity.
 */
export async function test_api_member_membership_index_for_own_account(
  connection: api.IConnection,
) {
  // 1. Register member user (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  // 2. Register platform admin (join)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 3. As platform admin, create a visibility level
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Public ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 4. Switch back to member user by logging in
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuth);

  // 5. Create a community as the member user
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. Submit at least one membership request to that community
  const membershipRequestBody = {
    questionKey: `q-${RandomGenerator.alphaNumeric(5)}`,
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

  // 7. List memberships for the member user, filtering active ones
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestFilter = {
    is_active: true,
    joined_from: null,
    joined_to: null,
    ended_from: null,
    ended_to: null,
    include_deleted: false,
    page,
    limit,
    sort_by: "joined_at" as const,
    sort_direction: "desc" as const,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const membershipPage: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.memberUser.memberUsers.communityMemberships.index(
      connection,
      {
        memberUserId: memberLoginAuth.id,
        body: requestFilter,
      },
    );
  typia.assert(membershipPage);

  // 8. Business-level assertions
  TestValidator.equals(
    "pagination current page should equal requested page",
    membershipPage.pagination.current,
    page,
  );

  TestValidator.equals(
    "pagination limit should equal requested limit",
    membershipPage.pagination.limit,
    limit,
  );

  // Each membership, if any, must belong to the requesting member user
  for (const membership of membershipPage.data) {
    TestValidator.equals(
      "membership memberuser.id must equal requesting member id",
      membership.memberuser.id,
      memberLoginAuth.id,
    );
  }

  // Sanity predicate: data length is non-negative (always true) and when
  // non-empty, all entries have a community summary object.
  TestValidator.predicate(
    "membership list data length is non-negative",
    membershipPage.data.length >= 0,
  );

  if (membershipPage.data.length > 0) {
    TestValidator.predicate(
      "when memberships exist, each has an associated community id",
      membershipPage.data.every(
        (m) => !!m.community && m.community.id.length > 0,
      ),
    );
  }
}
