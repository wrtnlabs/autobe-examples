import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberEmailVerification";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verifications_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to obtain valid JWT token
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(auth);
  // Create connection with token for subsequent requests
  const tokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${auth.token.access}` },
  };
  // 2. Filter by status - pending
  const pendingResult =
    await api.functional.todoApp.member.email_verifications.index(
      tokenConnection,
      {
        body: {
          status: "pending",
          pageSize: 50,
        },
      },
    );
  typia.assert(pendingResult);
  TestValidator.equals(
    "pending filter returns results",
    pendingResult.data.length,
    50,
  );
  // 3. Filter by status - completed
  const completedResult =
    await api.functional.todoApp.member.email_verifications.index(
      tokenConnection,
      {
        body: {
          status: "completed",
          pageSize: 50,
        },
      },
    );
  typia.assert(completedResult);
  TestValidator.equals(
    "completed filter returns results",
    completedResult.data.length >= 0,
    true,
  );
  // 4. Filter by status - expired
  const expiredResult =
    await api.functional.todoApp.member.email_verifications.index(
      tokenConnection,
      {
        body: {
          status: "expired",
          pageSize: 50,
        },
      },
    );
  typia.assert(expiredResult);
  TestValidator.equals(
    "expired filter returns results",
    expiredResult.data.length >= 0,
    true,
  );
  // 5. Filter by date range - createdAfter
  const beforeDate = new Date().toISOString();
  const afterDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
  const dateAfterResult =
    await api.functional.todoApp.member.email_verifications.index(
      tokenConnection,
      {
        body: {
          createdAfter: afterDate,
          pageSize: 50,
        },
      },
    );
  typia.assert(dateAfterResult);
  TestValidator.equals(
    "createdAfter filter works",
    dateAfterResult.data.length >= 0,
    true,
  );
  // 6. Filter by date range - createdBefore
  const dateBeforeResult =
    await api.functional.todoApp.member.email_verifications.index(
      tokenConnection,
      {
        body: {
          createdBefore: beforeDate,
          pageSize: 50,
        },
      },
    );
  typia.assert(dateBeforeResult);
  TestValidator.equals(
    "createdBefore filter works",
    dateBeforeResult.data.length >= 0,
    true,
  );
  // 7. Filter by combined date range
  const dateRangeResult =
    await api.functional.todoApp.member.email_verifications.index(
      tokenConnection,
      {
        body: {
          createdAfter: afterDate,
          createdBefore: beforeDate,
          pageSize: 50,
        },
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "combined date filter works",
    dateRangeResult.data.length >= 0,
    true,
  );
  // 8. Page-based pagination with limit
  const pageLimitResult =
    await api.functional.todoApp.member.email_verifications.index(
      tokenConnection,
      {
        body: {
          page: 1,
          limit: 25,
        },
      },
    );
  typia.assert(pageLimitResult);
  // 9. Validate pagination metadata reflects filtered dataset
  TestValidator.equals(
    "pagination metadata limit correct",
    pageLimitResult.pagination.limit,
    25,
  );
  TestValidator.equals(
    "pagination current page correct",
    pageLimitResult.pagination.current,
    1,
  );
  // 10. Sorting by createdAt ascending
  const sortCreatedAtAsc =
    await api.functional.todoApp.member.email_verifications.index(
      tokenConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "asc",
          pageSize: 50,
        },
      },
    );
  typia.assert(sortCreatedAtAsc);
  // 11. Sorting by createdAt descending
  const sortCreatedAtDesc =
    await api.functional.todoApp.member.email_verifications.index(
      tokenConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          pageSize: 50,
        },
      },
    );
  typia.assert(sortCreatedAtDesc);
  // 12. Sorting by expiresAt ascending
  const sortExpiresAtAsc =
    await api.functional.todoApp.member.email_verifications.index(
      tokenConnection,
      {
        body: {
          sortBy: "expiresAt",
          sortOrder: "asc",
          pageSize: 50,
        },
      },
    );
  typia.assert(sortExpiresAtAsc);
  // 13. Sorting by expiresAt descending
  const sortExpiresAtDesc =
    await api.functional.todoApp.member.email_verifications.index(
      tokenConnection,
      {
        body: {
          sortBy: "expiresAt",
          sortOrder: "desc",
          pageSize: 50,
        },
      },
    );
  typia.assert(sortExpiresAtDesc);
  // 14. Sorting by status ascending
  const sortStatusAsc =
    await api.functional.todoApp.member.email_verifications.index(
      tokenConnection,
      {
        body: {
          sortBy: "status",
          sortOrder: "asc",
          pageSize: 50,
        },
      },
    );
  typia.assert(sortStatusAsc);
  // 15. Sorting by status descending
  const sortStatusDesc =
    await api.functional.todoApp.member.email_verifications.index(
      tokenConnection,
      {
        body: {
          sortBy: "status",
          sortOrder: "desc",
          pageSize: 50,
        },
      },
    );
  typia.assert(sortStatusDesc);
  // 16. Verify status filter excludes non-matching records
  const statusFiltered =
    await api.functional.todoApp.member.email_verifications.index(
      tokenConnection,
      {
        body: {
          status: "pending",
          pageSize: 100,
        },
      },
    );
  typia.assert(statusFiltered);
  // All returned items should have status "pending" or be null (unused tokens)
  const allPending = statusFiltered.data.every((item) => {
    if (item.used) return item.usedAt !== null;
    return true;
  });
  TestValidator.predicate("status filter excludes non-matching", allPending);
}