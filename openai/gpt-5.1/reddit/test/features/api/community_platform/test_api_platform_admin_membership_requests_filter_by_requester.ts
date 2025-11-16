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
 * Validate that a platform administrator can filter community membership
 * requests by requesting member user using the PATCH listing endpoint.
 *
 * Business workflow:
 *
 * 1. Register a platform administrator and obtain an authenticated admin session.
 * 2. As platformAdmin, create a community visibility level to be used for
 *    community creation.
 * 3. Register two distinct member users (member1 and member2).
 * 4. As member1, create a community using the created visibility level.
 * 5. As member1, submit a membership request targeting that community.
 * 6. As member2, submit multiple membership requests targeting the same community.
 * 7. As platformAdmin, call the PATCH
 *    /communityPlatform/platformAdmin/communities/{communityIdentifier}/membershipRequests
 *    endpoint with requester_memberuser_id set to member2.id.
 *
 * Validations:
 *
 * - All returned membership request summaries have requester.id equal to
 *   member2.id.
 * - No summary in the filtered list belongs to member1 (requester.id !==
 *   member1.id).
 * - Pagination metadata is consistent with the number of returned items and at
 *   least the number of created member2 requests.
 */
export async function test_api_platform_admin_membership_requests_filter_by_requester(
  connection: api.IConnection,
) {
  // ---------------------------
  // 1. Platform admin join
  // ---------------------------
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword = RandomGenerator.alphaNumeric(16);

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: "https://admin.example.com/join" as string & tags.Format<"uri">,
        referrer: "https://admin.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdmin);

  // ---------------------------
  // 2. Create visibility level as platformAdmin
  // ---------------------------
  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public Visibility",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // ---------------------------
  // 3. Register member1 and member2
  // ---------------------------
  const member1Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const member2Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const member1Password = RandomGenerator.alphaNumeric(14);
  const member2Password = RandomGenerator.alphaNumeric(14);

  // member1 join (token becomes member1)
  const member1: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: member1Email,
        password: member1Password,
        ip: undefined,
        href: "https://app.example.com/join" as string & tags.Format<"uri">,
        referrer: "https://app.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(member1);

  // ---------------------------
  // 4. As member1, create a community
  // ---------------------------
  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier matches payload",
    community.identifier,
    communityIdentifier,
  );

  // Still member1: create one membership request for this community
  const member1Request: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          questionKey: "why_join_member1",
          answerText: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate,
      },
    );
  typia.assert(member1Request);

  TestValidator.equals(
    "member1 request requester id matches member1",
    member1Request.requesterMemberUser.id,
    member1.id,
  );

  // ---------------------------
  // 5. Register member2 and create membership requests as member2
  // ---------------------------
  const member2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: member2Email,
        password: member2Password,
        ip: undefined,
        href: "https://app.example.com/join" as string & tags.Format<"uri">,
        referrer: "https://app.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(member2);

  // After member2.join, Authorization is member2, so we can directly create
  // membership requests as member2.
  const member2RequestCount = 2;
  const member2Requests: ICommunityPlatformCommunityMembershipRequest[] = [];

  for (let i = 0; i < member2RequestCount; i++) {
    const req: ICommunityPlatformCommunityMembershipRequest =
      await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
        connection,
        {
          communityIdentifier: community.identifier,
          body: {
            questionKey: `why_join_member2_${i}`,
            answerText: RandomGenerator.paragraph({ sentences: 3 + i }),
          } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate,
        },
      );
    typia.assert(req);
    member2Requests.push(req);
  }

  TestValidator.equals(
    "created expected number of member2 membership requests",
    member2Requests.length,
    member2RequestCount,
  );

  // ---------------------------
  // 6. Switch back to platformAdmin via login
  // ---------------------------
  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: platformAdminPassword,
        ip: undefined,
        href: "https://admin.example.com/login" as string & tags.Format<"uri">,
        referrer: "https://admin.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLogin);

  // ---------------------------
  // 7. As platformAdmin, filter membership requests by requester_memberuser_id
  // ---------------------------
  const page: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.platformAdmin.communities.membershipRequests.index(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          status: null,
          requester_memberuser_id: member2.id,
          from_requested_at: null,
          to_requested_at: null,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
          order_by: null,
          order_direction: null,
        } satisfies ICommunityPlatformCommunityMembershipRequest.IRequest,
      },
    );
  typia.assert(page);

  const summaries = page.data;

  // Ensure at least one request is returned for member2
  TestValidator.predicate(
    "at least one membership request is returned for member2",
    summaries.length >= member2Requests.length,
  );

  // All returned summaries must have requester.id == member2.id
  for (const summary of summaries) {
    TestValidator.equals(
      "each summary requester id matches member2",
      summary.requester.id,
      member2.id,
    );
  }

  // Ensure that no summary belongs to member1
  const hasMember1 = summaries.some((s) => s.requester.id === member1.id);
  TestValidator.predicate(
    "no summary should have requester equal to member1",
    !hasMember1,
  );

  // Pagination metadata consistency
  TestValidator.predicate(
    "pagination.records is at least the number of returned summaries",
    page.pagination.records >= summaries.length,
  );

  TestValidator.predicate(
    "pagination.records is at least the number of member2 requests created",
    page.pagination.records >= member2Requests.length,
  );

  TestValidator.predicate(
    "pagination.current equals requested page 1",
    page.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination.limit is at least the number of returned summaries",
    page.pagination.limit >= summaries.length,
  );
}
