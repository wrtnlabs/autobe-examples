import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatusHistory";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityStatusHistory";

export async function test_api_admin_community_status_history_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Register an admin user (adminUser join)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Adm1nPass!", // must satisfy password format, content not constrained beyond that
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail: string & tags.Format<"email"> = adminAuthorized.email;

  // 2. Register a member user (memberUser join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass!",
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As memberUser, create a community
  const communitySlug: string = RandomGenerator.alphabets(12);
  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
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

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  TestValidator.equals(
    "created community slug matches requested slug",
    createdCommunity.slug,
    communitySlug,
  );

  // Capture timestamps for filtering
  const now = new Date();
  const fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  const toDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour in future to cover recent events

  const createdFrom = fromDate.toISOString();
  const createdTo = toDate.toISOString();

  // 4. Authenticate again explicitly as admin (login) to ensure admin token is active
  const adminLoginBody = {
    identifier: adminEmail,
    password: "Adm1nPass!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 5. Call admin status history search with filters.
  // We pick some reasonable filter values; in real data they may or may not
  // match any records, but the invariant we can assert is that any returned
  // records obey the filters we set.
  const filterNewStatus = "locked";
  const filterNewVisibility = "restricted";
  const filterReasonCategory = "moderation";
  const filterActorType = "admin";

  const requestBody: ICommunityPlatformCommunityStatusHistory.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sortBy: "created_at",
    sortDirection: "desc",
    createdFrom,
    createdTo,
    newStatus: filterNewStatus,
    newVisibility: filterNewVisibility,
    reasonCategory: filterReasonCategory,
    actorType: filterActorType,
  };

  const pageResult: IPageICommunityPlatformCommunityStatusHistory.ISummary =
    await api.functional.communityPlatform.adminUser.communities.statusHistories.index(
      connection,
      {
        communitySlug: createdCommunity.slug,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // Basic pagination invariants
  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "pagination current page must be >= 0",
    () => pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit must be >= 0",
    () => pagination.limit >= 0,
  );

  // 6. Validate that all records, if present, satisfy filters and belong to the community
  const histories: ICommunityPlatformCommunityStatusHistory.ISummary[] =
    pageResult.data;

  await ArrayUtil.asyncForEach(histories, async (history) => {
    typia.assert(history);

    // Community slug must match our created community
    TestValidator.equals(
      "history community slug matches filter community",
      history.community.slug,
      createdCommunity.slug,
    );

    // createdAt/created_at window checks:
    const createdAt: string = history.createdAt ?? history.created_at;

    TestValidator.predicate(
      "history createdAt is within [createdFrom, createdTo]",
      () => createdAt >= createdFrom && createdAt <= createdTo,
    );

    // newStatus/new_status checks (we use camelCase alias if present, else snake_case)
    const newStatusValue: string = history.newStatus ?? history.new_status;

    TestValidator.equals(
      "history newStatus matches filter",
      newStatusValue,
      filterNewStatus,
    );

    // newVisibility/new_visibility checks
    const newVisibilityValue: string =
      history.newVisibility ?? history.new_visibility;

    TestValidator.equals(
      "history newVisibility matches filter",
      newVisibilityValue,
      filterNewVisibility,
    );

    // reasonCategory/reason_category checks
    const reasonCategoryValue: string | null | undefined =
      history.reasonCategory ?? history.reason_category;

    TestValidator.equals(
      "history reasonCategory matches filter",
      reasonCategoryValue,
      filterReasonCategory,
    );

    // actorType filter: when we asked for actorType="admin", we expect that
    // the record was driven by an admin actor. The ISummary DTO does not expose
    // explicit actor fields, so the best we can do is assert that the service
    // honored the actorType filter by trusting that any records returned are
    // consistent with the filter. We therefore only validate that at least
    // the filter actorType was specified and results are non-conflicting with
    // the requested community context, leaving actor-type internals to the
    // backend implementation.
  });

  // 7. High-level consistency: when there are any results, verify that
  // pagination.records is at least the number of returned data items.
  TestValidator.predicate(
    "pagination.records must be >= number of returned histories",
    () => pagination.records >= histories.length,
  );
}
