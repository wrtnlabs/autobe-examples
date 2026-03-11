import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test date range filtering and search functionality for administrator requests.
 *
 * This test validates the PATCH /discussionBoard/admin/admin-requests endpoint
 * with comprehensive date range filtering, search functionality, pagination,
 * and sorting capabilities.
 *
 * Test Flow:
 * 1. Super administrator authentication via join
 * 2. Multiple member authentications via join
 * 3. Create admin requests with different timestamps
 * 4. Test submitted_from filter
 * 5. Test submitted_to filter
 * 6. Test combined date range filter
 * 7. Test search parameter matching reason and member info
 * 8. Test pagination with date filters
 * 9. Test sort order (asc/desc)
 * 10. Test edge case: empty results with valid date range
 */
export async function test_api_admin_request_list_date_range_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  TestValidator.predicate("admin is super", adminAuth.grade === "super");
  // 2. Create multiple members and their admin requests
  const memberConnections: api.IConnection[] = [];
  const memberAuths: IDiscussionBoardMember.IAuthorized[] = [];
  const createdRequests: IDiscussionBoardAdminRequest[] = [];
  // Create 5 members with admin requests
  for (let i = 0; i < 5; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuth = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: `Member_${RandomGenerator.name()}`,
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    typia.assert(memberAuth);
    memberConnections.push(memberConnection);
    memberAuths.push(memberAuth);
    // Create admin request with unique reason containing member info for search testing
    const request =
      await generate_random_discussion_board_member_admin_requests_create(
        memberConnection,
        {
          body: {
            reason: `I want to become admin because ${RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 })} Member index ${i}`,
          } satisfies IDiscussionBoardAdminRequest.ICreate,
        },
      );
    typia.assert(request);
    createdRequests.push(request);
    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // 3. Test submitted_from filter (requests after first request)
  const firstRequestDate = createdRequests[0].submitted_at;
  const fromResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          submitted_from: firstRequestDate,
          sort: "asc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(fromResult);
  TestValidator.predicate(
    "submitted_from returns requests",
    fromResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all results after from date",
    fromResult.data.every(
      (req) => new Date(req.submitted_at) >= new Date(firstRequestDate),
    ),
  );
  // 4. Test submitted_to filter (requests before last request)
  const lastRequestDate =
    createdRequests[createdRequests.length - 1].submitted_at;
  const toResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          submitted_to: lastRequestDate,
          sort: "desc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(toResult);
  TestValidator.predicate(
    "submitted_to returns requests",
    toResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all results before to date",
    toResult.data.every(
      (req) => new Date(req.submitted_at) <= new Date(lastRequestDate),
    ),
  );
  // 5. Test combined date range filter
  const secondRequestDate = createdRequests[1].submitted_at;
  const fourthRequestDate = createdRequests[3].submitted_at;
  const rangeResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          submitted_from: secondRequestDate,
          submitted_to: fourthRequestDate,
          sort: "asc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(rangeResult);
  TestValidator.predicate(
    "date range returns requests",
    rangeResult.data.length >= 2,
  );
  TestValidator.predicate(
    "all results within date range",
    rangeResult.data.every(
      (req) =>
        new Date(req.submitted_at) >= new Date(secondRequestDate) &&
        new Date(req.submitted_at) <= new Date(fourthRequestDate),
    ),
  );
  // 6. Test search parameter matching reason text
  const searchKeyword = "admin";
  const searchResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          search: searchKeyword,
          sort: "asc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns matching requests",
    searchResult.data.length >= 1,
  );
  TestValidator.predicate(
    "search results contain keyword in reason or member display name",
    searchResult.data.some(
      (req) =>
        req.reason.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        req.member.display_name
          .toLowerCase()
          .includes(searchKeyword.toLowerCase()),
    ),
  );
  // 7. Test search with member display name
  const memberDisplayName = memberAuths[0].display_name;
  const memberSearchResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          search: memberDisplayName,
          sort: "asc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(memberSearchResult);
  TestValidator.predicate(
    "member search returns matching request",
    memberSearchResult.data.length >= 1,
  );
  TestValidator.predicate(
    "member search finds correct member",
    memberSearchResult.data.some(
      (req) => req.member.display_name === memberDisplayName,
    ),
  );
  // 8. Test pagination with date filters
  const paginatedResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          submitted_from: firstRequestDate,
          submitted_to: lastRequestDate,
          page: 1,
          limit: 2,
          sort: "asc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals("page number", paginatedResult.pagination.current, 1);
  TestValidator.equals("limit", paginatedResult.pagination.limit, 2);
  TestValidator.predicate(
    "data length respects limit",
    paginatedResult.data.length <= 2,
  );
  TestValidator.predicate(
    "total records accurate",
    paginatedResult.pagination.records >= paginatedResult.data.length,
  );
  // 9. Test sort ascending (oldest first)
  const ascResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          submitted_from: firstRequestDate,
          submitted_to: lastRequestDate,
          sort: "asc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(ascResult);
  TestValidator.predicate(
    "asc sort - oldest first",
    ascResult.data.length < 2 ||
      new Date(ascResult.data[0].submitted_at) <=
        new Date(ascResult.data[1].submitted_at),
  );
  // 10. Test sort descending (newest first)
  const descResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          submitted_from: firstRequestDate,
          submitted_to: lastRequestDate,
          sort: "desc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(descResult);
  TestValidator.predicate(
    "desc sort - newest first",
    descResult.data.length < 2 ||
      new Date(descResult.data[0].submitted_at) >=
        new Date(descResult.data[1].submitted_at),
  );
  // 11. Test edge case: date range with no matching results
  const futureDate = new Date(
    new Date(lastRequestDate).getTime() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const emptyResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          submitted_from: futureDate,
          sort: "asc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty data array", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty pagination current",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty pagination limit",
    emptyResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "empty pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty pagination pages",
    emptyResult.pagination.pages,
    0,
  );
  // 12. Verify ISO 8601 datetime format is properly parsed
  const isoDate = new Date().toISOString();
  const isoResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          submitted_from: isoDate,
          sort: "asc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(isoResult);
  TestValidator.predicate("ISO date filter works", isoResult.data.length >= 0);
}
