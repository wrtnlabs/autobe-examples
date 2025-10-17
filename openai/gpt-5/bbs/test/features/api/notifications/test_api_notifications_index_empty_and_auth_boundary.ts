import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussNotification";

export async function test_api_notifications_index_empty_and_auth_boundary(
  connection: api.IConnection,
) {
  /**
   * Validate authentication boundary and default notifications listing for a
   * new member.
   *
   * Steps:
   *
   * 1. Unauthenticated GET should be 401 Unauthorized.
   * 2. Join as a member (SDK will set Authorization on the same connection).
   * 3. Authenticated GET should return 200 with empty data and coherent
   *    pagination.
   * 4. If any items exist (defensive), verify createdAt desc ordering by IDs
   *    sequence.
   */

  // 1) Unauthenticated boundary: create a clean unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.httpError(
    "unauthenticated notifications index returns 401",
    401,
    async () => {
      await api.functional.econDiscuss.member.me.notifications.index(
        unauthConn,
      );
    },
  );

  // 2) Join as a member to obtain authenticated session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;

  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 3) Authenticated listing should be successful; for a fresh user expect empty list
  const page =
    await api.functional.econDiscuss.member.me.notifications.index(connection);
  typia.assert<IPageIEconDiscussNotification>(page);

  // Basic emptiness & pagination validations
  TestValidator.equals(
    "new member notifications data should be empty",
    page.data.length,
    0,
  );
  TestValidator.equals(
    "new member notifications total records should be 0",
    page.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages equals 0 when no records exist",
    page.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination limit must be non-negative",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination current must be non-negative",
    page.pagination.current >= 0,
  );

  // 4) Defensive: if any items exist, verify createdAt desc ordering by ID sequence
  if (page.data.length >= 2) {
    const sorted = [...page.data].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    const actualIds = page.data.map((n) => n.id);
    const expectedIds = sorted.map((n) => n.id);
    TestValidator.equals(
      "notifications ordered by createdAt desc (IDs sequence)",
      actualIds,
      expectedIds,
    );
  }
}
