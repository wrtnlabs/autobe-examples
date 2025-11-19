import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";

/**
 * Validate retrieval of the admin account list including soft-deleted entries.
 *
 * Business context: Compliance, audit, and operational review often require
 * privileged actors (admins) to retrieve the complete list of administrator
 * accounts, including those that have been soft-deleted (deactivated but not
 * removed from the system). This ensures visibility into both active and
 * deactivated actors for traceability and privilege review.
 *
 * Test steps:
 *
 * 1. Create and authenticate as an initial admin (adminA) using the join endpoint.
 * 2. Use adminA to create a second admin account (adminB) via the join endpoint.
 * 3. (Simulation only) - Since there's no API to soft-delete an admin, we cannot
 *    actually set deleted_at, but can still call the listing scenarios.
 * 4. Call the discussionBoard.admin.admins.index API with filter { deleted:
 *    undefined } and verify both admins appear (deleted_at should be
 *    null/undefined).
 * 5. Call with { deleted: true } and expect zero results (since no admin is
 *    soft-deleted).
 * 6. Call with { deleted: false } and expect both admins (deleted_at
 *    null/undefined).
 * 7. Assert that for all listed admins, deleted_at is null/undefined.
 */
export async function test_api_admin_account_list_soft_deleted_included(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as first admin (adminA)
  const adminAJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href: "https://discussion.example.com/admin/register",
    referrer: "https://discussion.example.com/login",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminA = await api.functional.auth.admin.join(connection, {
    body: adminAJoin,
  });
  typia.assert(adminA);

  // 2. Create a second admin (adminB) while authenticated as adminA
  const adminBJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href: "https://discussion.example.com/admin/register",
    referrer: "https://discussion.example.com/login",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminB = await api.functional.auth.admin.join(connection, {
    body: adminBJoin,
  });
  typia.assert(adminB);

  // 3. (Simulation only) - No API for admin soft-deletion, so only active states present

  // 4. List admins with no deleted filter (all)
  const resAll = await api.functional.discussionBoard.admin.admins.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(resAll);
  TestValidator.predicate(
    "all admins should be listed (active only, since no soft-delete)",
    resAll.data.some((a) => a.id === adminA.id) &&
      resAll.data.some((a) => a.id === adminB.id),
  );
  for (const admin of resAll.data) {
    TestValidator.predicate(
      "deleted_at must be unset for active admins",
      admin.deleted_at === null || admin.deleted_at === undefined,
    );
  }

  // 5. List only soft-deleted admins (deleted = true)
  const resDeleted = await api.functional.discussionBoard.admin.admins.index(
    connection,
    {
      body: { deleted: true } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(resDeleted);
  TestValidator.equals(
    "no soft-deleted admins exist, so deleted filter returns empty",
    resDeleted.data.length,
    0,
  );

  // 6. List only active admins (deleted = false)
  const resActive = await api.functional.discussionBoard.admin.admins.index(
    connection,
    {
      body: { deleted: false } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(resActive);
  TestValidator.predicate(
    "both admins are active",
    resActive.data.some((a) => a.id === adminA.id) &&
      resActive.data.some((a) => a.id === adminB.id),
  );
  for (const admin of resActive.data) {
    TestValidator.predicate(
      "deleted_at must be unset for active admins",
      admin.deleted_at === null || admin.deleted_at === undefined,
    );
  }
}
