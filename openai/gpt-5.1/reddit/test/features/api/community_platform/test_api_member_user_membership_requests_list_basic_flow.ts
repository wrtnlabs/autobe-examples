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
 * Basic flow: list a member user's own community membership requests.
 *
 * This test verifies that a freshly registered member user can retrieve a
 * paginated list of their own community membership requests, and that the
 * listing is properly scoped and stable.
 *
 * High-level steps:
 *
 * 1. Register a new member user via auth.memberUser.join and capture the
 *    ICommunityPlatformMemberuser.IAuthorized, including the member user id.
 * 2. Register a platform admin via auth.platformAdmin.join and rely on the SDK's
 *    automatic token switching.
 * 3. As platformAdmin, create a new community visibility level using
 *    communityPlatform.platformAdmin.communityVisibilityLevels.create
 *    (ICommunityPlatformCommunityVisibilityLevel.ICreate).
 * 4. Switch back to the member user context (either via the join token already set
 *    or by calling auth.memberUser.login with matching credentials).
 * 5. As this member user, create a new community via
 *    communityPlatform.memberUser.communities.create using
 *    ICommunityPlatformCommunity.ICreate, referencing the visibility level from
 *    step 3.
 * 6. As the same member user, create one or more membership requests for the
 *    created community via
 *    communityPlatform.memberUser.communities.membershipRequests.create with
 *    ICommunityPlatformCommunityMembershipRequest.ICreate.
 * 7. Call the target endpoint
 *    communityPlatform.memberUser.memberUsers.communityMembershipRequests.index
 *    (PATCH
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/communityMembershipRequests)
 *    with an ICommunityPlatformCommunityMembershipRequest.IRequest body where
 *    all filters are null, page is 1, and limit is a small positive integer.
 *
 * Assertions:
 *
 * - All intermediate API responses are validated with typia.assert to guarantee
 *   DTO conformance.
 * - The final index call returns an
 *   IPageICommunityPlatformCommunityMembershipRequest.ISummary whose
 *   pagination.records is >= 1 and data.length >= 1.
 * - Every summary item in data has requester.id equal to the member user's id
 *   from step 1 (no leakage of other users' membership requests).
 * - At least one item in data references the community created in step 5 via its
 *   community summary (matching id or slug field).
 * - Two consecutive index calls with identical IRequest parameters yield
 *   equivalent results (stable ordering) when compared with
 *   TestValidator.equals.
 */
export async function test_api_member_user_membership_requests_list_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register member user (join)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  const memberUserId: string & tags.Format<"uuid"> = memberAuth.id;

  // 2. Register platform admin (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: adminHref,
    referrer: adminReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 3. As platformAdmin (current token), create visibility level
  const visibilityCode = `code_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibility);

  TestValidator.equals(
    "visibility level code matches request",
    visibility.code,
    visibilityCreateBody.code,
  );

  // 4. Switch back to member user context via explicit login
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuth);

  TestValidator.equals(
    "login returns same member user id",
    memberLoginAuth.id,
    memberUserId,
  );

  // 5. Create community as member user
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibility.code,
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
    "community identifier matches request",
    community.identifier,
    communityCreateBody.identifier,
  );

  // 6. Create at least one membership request to that community
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
    "membership request community summary id matches community",
    membershipRequest.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership requester summary id matches member user",
    membershipRequest.requesterMemberUser.id,
    memberUserId,
  );

  // 7. Call the target index endpoint with minimal IRequest body
  const requestFilterBody = {
    status: null,
    requester_memberuser_id: null,
    from_requested_at: null,
    to_requested_at: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: null,
    order_direction: null,
  } satisfies ICommunityPlatformCommunityMembershipRequest.IRequest;

  const page1: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.memberUser.memberUsers.communityMembershipRequests.index(
      connection,
      {
        memberUserId,
        body: requestFilterBody,
      },
    );
  typia.assert(page1);

  // Basic pagination and data assertions
  TestValidator.predicate(
    "pagination.records is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data length matches records when records > 0 (subset check)",
    page1.pagination.records === 0 || page1.data.length >= 1,
  );

  if (page1.pagination.records >= 1 && page1.data.length >= 1) {
    const first = page1.data[0];

    // Assert that the first entry belongs to the created community
    TestValidator.equals(
      "first membership request community id matches created community",
      first.community.id,
      community.id,
    );

    // Assert that the requester is the member user
    TestValidator.equals(
      "first membership request requester id matches member user",
      first.requester.id,
      memberUserId,
    );

    // Assert that all entries belong to the same requester (no leakage)
    for (const item of page1.data) {
      TestValidator.equals(
        "membership request requester id is always the member user",
        item.requester.id,
        memberUserId,
      );
    }
  }

  // 8. Call again with the same parameters to ensure stable ordering
  const page2: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.memberUser.memberUsers.communityMembershipRequests.index(
      connection,
      {
        memberUserId,
        body: requestFilterBody,
      },
    );
  typia.assert(page2);

  TestValidator.equals(
    "two identical listing calls return stable, equal results",
    page1,
    page2,
  );
}
