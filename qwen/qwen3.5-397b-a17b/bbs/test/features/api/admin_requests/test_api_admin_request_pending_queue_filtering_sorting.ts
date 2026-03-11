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
 * Test the filtering and sorting capabilities of the pending administrator requests endpoint.
 *
 * This test validates:
 * 1. Super administrator authentication
 * 2. Multiple member account creation with admin request submissions
 * 3. Date range filtering (submitted_from, submitted_to)
 * 4. Text search filtering on reason and member display name
 * 5. Sorting in ascending (oldest first) and descending (newest first) order
 * 6. Pagination with limit parameter
 * 7. Automatic status='pending' filter enforcement
 */
export async function test_api_admin_request_pending_queue_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Super Admin",
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create first member and submit admin request
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Alice Johnson",
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member1);
  const request1 =
    await generate_random_discussion_board_member_admin_requests_create(
      member1Connection,
      {
        body: {
          reason:
            "I have extensive experience in community moderation and want to help maintain discussion quality.",
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(request1);
  // 3. Create second member and submit admin request
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Bob Smith",
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member2);
  const request2 =
    await generate_random_discussion_board_member_admin_requests_create(
      member2Connection,
      {
        body: {
          reason:
            "I am a software developer interested in contributing to platform security and feature development.",
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(request2);
  // 4. Create third member and submit admin request
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Charlie Brown",
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member3);
  const request3 =
    await generate_random_discussion_board_member_admin_requests_create(
      member3Connection,
      {
        body: {
          reason:
            "I want to become an administrator to help manage community events and discussions.",
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(request3);
  // 5. Test: Get all pending requests (no filters)
  const allPending =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(allPending);
  TestValidator.predicate(
    "all pending requests returned",
    allPending.data.length >= 3,
  );
  TestValidator.predicate(
    "all requests have pending status",
    allPending.data.every((r) => r.status === "pending"),
  );
  // 6. Test: Sort ascending (oldest first)
  const sortedAsc =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      adminConnection,
      {
        body: {
          sort: "asc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(sortedAsc);
  TestValidator.predicate("ascending order correct", () => {
    for (let i = 1; i < sortedAsc.data.length; i++) {
      if (
        new Date(sortedAsc.data[i - 1].submitted_at) >
        new Date(sortedAsc.data[i].submitted_at)
      ) {
        return false;
      }
    }
    return true;
  });
  // 7. Test: Sort descending (newest first)
  const sortedDesc =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      adminConnection,
      {
        body: {
          sort: "desc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(sortedDesc);
  TestValidator.predicate("descending order correct", () => {
    for (let i = 1; i < sortedDesc.data.length; i++) {
      if (
        new Date(sortedDesc.data[i - 1].submitted_at) <
        new Date(sortedDesc.data[i].submitted_at)
      ) {
        return false;
      }
    }
    return true;
  });
  // 8. Test: Search by reason text
  const searchResult =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      adminConnection,
      {
        body: {
          search: "security",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate("search filters by reason", () => {
    return searchResult.data.every(
      (r) =>
        r.reason.toLowerCase().includes("security") ||
        r.member.display_name.toLowerCase().includes("security"),
    );
  });
  // 9. Test: Search by member display name
  const searchByName =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      adminConnection,
      {
        body: {
          search: "Alice",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchByName);
  TestValidator.predicate("search filters by display name", () => {
    return searchByName.data.every(
      (r) =>
        r.member.display_name.includes("Alice") ||
        r.reason.toLowerCase().includes("alice"),
    );
  });
  // 10. Test: Date range filter (submitted_from)
  const dateFromResult =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      adminConnection,
      {
        body: {
          submitted_from: request2.submitted_at,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(dateFromResult);
  TestValidator.predicate("submitted_from filter works", () => {
    return dateFromResult.data.every(
      (r) => new Date(r.submitted_at) >= new Date(request2.submitted_at),
    );
  });
  // 11. Test: Date range filter (submitted_to)
  const dateToResult =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      adminConnection,
      {
        body: {
          submitted_to: request2.submitted_at,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(dateToResult);
  TestValidator.predicate("submitted_to filter works", () => {
    return dateToResult.data.every(
      (r) => new Date(r.submitted_at) <= new Date(request2.submitted_at),
    );
  });
  // 12. Test: Pagination with limit
  const paginated =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      adminConnection,
      {
        body: {
          limit: 2,
          page: 1,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.predicate(
    "pagination limit respected",
    paginated.data.length <= 2,
  );
  TestValidator.equals(
    "pagination current page",
    paginated.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginated.pagination.limit, 2);
  // 13. Test: Combined filters (search + sort + pagination)
  const combined =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      adminConnection,
      {
        body: {
          search: "administrator",
          sort: "desc",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(combined);
  TestValidator.predicate("combined filters work", () => {
    return combined.data.every(
      (r) =>
        r.reason.toLowerCase().includes("administrator") ||
        r.member.display_name.toLowerCase().includes("administrator"),
    );
  });
  TestValidator.predicate("combined sort descending", () => {
    for (let i = 1; i < combined.data.length; i++) {
      if (
        new Date(combined.data[i - 1].submitted_at) <
        new Date(combined.data[i].submitted_at)
      ) {
        return false;
      }
    }
    return true;
  });
}
