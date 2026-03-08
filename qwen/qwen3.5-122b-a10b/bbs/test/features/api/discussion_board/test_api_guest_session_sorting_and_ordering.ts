import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test guest session sorting and ordering functionality.
 * 1. Authenticate as admin
 * 2. Query guest sessions with default sorting (created_at descending)
 * 3. Test sorting by created_at ascending/descending
 * 4. Test sorting by expired_at ascending/descending
 * 5. Test sorting by ip ascending/descending
 * 6. Validate sort order is correctly applied
 * 7. Test pagination with sorting
 */
export async function test_api_guest_session_sorting_and_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test default sorting (created_at descending)
  const defaultSort = await api.functional.discussionBoard.admin.guests.index(
    adminConnection,
    {
      body: {
        session_type: "guest",
        limit: 10,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(defaultSort);
  // Verify default sort is created_at descending if multiple sessions exist
  if (defaultSort.data.length > 1) {
    for (let i = 0; i < defaultSort.data.length - 1; i++) {
      TestValidator.predicate(
        `default sort created_at descending at index ${i}`,
        defaultSort.data[i].created_at >= defaultSort.data[i + 1].created_at,
      );
    }
  }
  // 3. Test sorting by created_at ascending
  const createdAsc = await api.functional.discussionBoard.admin.guests.index(
    adminConnection,
    {
      body: {
        session_type: "guest",
        sort_by: "created_at",
        order: "asc",
        limit: 10,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(createdAsc);
  if (createdAsc.data.length > 1) {
    for (let i = 0; i < createdAsc.data.length - 1; i++) {
      TestValidator.predicate(
        `created_at ascending at index ${i}`,
        createdAsc.data[i].created_at <= createdAsc.data[i + 1].created_at,
      );
    }
  }
  // 4. Test sorting by created_at descending explicitly
  const createdDesc = await api.functional.discussionBoard.admin.guests.index(
    adminConnection,
    {
      body: {
        session_type: "guest",
        sort_by: "created_at",
        order: "desc",
        limit: 10,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(createdDesc);
  if (createdDesc.data.length > 1) {
    for (let i = 0; i < createdDesc.data.length - 1; i++) {
      TestValidator.predicate(
        `created_at descending at index ${i}`,
        createdDesc.data[i].created_at >= createdDesc.data[i + 1].created_at,
      );
    }
  }
  // 5. Test sorting by expired_at ascending
  const expiredAsc = await api.functional.discussionBoard.admin.guests.index(
    adminConnection,
    {
      body: {
        session_type: "guest",
        sort_by: "expired_at",
        order: "asc",
        limit: 10,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(expiredAsc);
  if (expiredAsc.data.length > 1) {
    for (let i = 0; i < expiredAsc.data.length - 1; i++) {
      TestValidator.predicate(
        `expired_at ascending at index ${i}`,
        expiredAsc.data[i].expired_at <= expiredAsc.data[i + 1].expired_at,
      );
    }
  }
  // 6. Test sorting by expired_at descending
  const expiredDesc = await api.functional.discussionBoard.admin.guests.index(
    adminConnection,
    {
      body: {
        session_type: "guest",
        sort_by: "expired_at",
        order: "desc",
        limit: 10,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(expiredDesc);
  if (expiredDesc.data.length > 1) {
    for (let i = 0; i < expiredDesc.data.length - 1; i++) {
      TestValidator.predicate(
        `expired_at descending at index ${i}`,
        expiredDesc.data[i].expired_at >= expiredDesc.data[i + 1].expired_at,
      );
    }
  }
  // 7. Test sorting by ip ascending
  const ipAsc = await api.functional.discussionBoard.admin.guests.index(
    adminConnection,
    {
      body: {
        session_type: "guest",
        sort_by: "ip",
        order: "asc",
        limit: 10,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(ipAsc);
  if (ipAsc.data.length > 1) {
    for (let i = 0; i < ipAsc.data.length - 1; i++) {
      TestValidator.predicate(
        `ip ascending at index ${i}`,
        ipAsc.data[i].ip <= ipAsc.data[i + 1].ip,
      );
    }
  }
  // 8. Test sorting by ip descending
  const ipDesc = await api.functional.discussionBoard.admin.guests.index(
    adminConnection,
    {
      body: {
        session_type: "guest",
        sort_by: "ip",
        order: "desc",
        limit: 10,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(ipDesc);
  if (ipDesc.data.length > 1) {
    for (let i = 0; i < ipDesc.data.length - 1; i++) {
      TestValidator.predicate(
        `ip descending at index ${i}`,
        ipDesc.data[i].ip >= ipDesc.data[i + 1].ip,
      );
    }
  }
  // 9. Test pagination with sorting
  const page1 = await api.functional.discussionBoard.admin.guests.index(
    adminConnection,
    {
      body: {
        session_type: "guest",
        sort_by: "created_at",
        order: "desc",
        page: 1,
        limit: 3,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(page1);
  const page2 = await api.functional.discussionBoard.admin.guests.index(
    adminConnection,
    {
      body: {
        session_type: "guest",
        sort_by: "created_at",
        order: "desc",
        page: 2,
        limit: 3,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "pagination page 1 current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination page 2 current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("pagination page 1 limit", page1.pagination.limit, 3);
  TestValidator.equals("pagination page 2 limit", page2.pagination.limit, 3);
  TestValidator.predicate(
    "pagination page 1 limit respected",
    page1.data.length <= 3,
  );
  TestValidator.predicate(
    "pagination page 2 limit respected",
    page2.data.length <= 3,
  );
  // 10. Test filtering with sorting
  const filtered = await api.functional.discussionBoard.admin.guests.index(
    adminConnection,
    {
      body: {
        session_type: "guest",
        sort_by: "created_at",
        order: "desc",
        limit: 10,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(filtered);
  TestValidator.predicate(
    "filter session_type guest",
    filtered.data.every((s) => s.type === "guest"),
  );
  TestValidator.predicate(
    "pagination records count valid",
    filtered.pagination.records >= filtered.data.length,
  );
}
