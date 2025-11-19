import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";

/**
 * Validate that querying with the 'deleted' filter returns only soft-deleted
 * attachments and no active files.
 *
 * Ensures that deletion status filtering works as designed, and that the
 * results are accurate relative to attachment lifecycle state (soft-deleted vs.
 * active).
 *
 * 1. Register a new board administrator (join)
 * 2. Authenticate as the new admin (token setup is automatic after join)
 * 3. Query the attachments list with deleted=true (admin only endpoint)
 * 4. Check that every returned attachment has deleted_at set (not null/undefined)
 * 5. Check that NO returned attachment has deleted_at null or undefined
 * 6. (Optionally) If no soft-deleted records exist, allow empty data array but
 *    still assert correct behavior
 */
export async function test_api_admin_attachment_list_deleted_only(
  connection: api.IConnection,
) {
  // 1. Register a new discussion board admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href: "https://admin-portal.example.com/register",
    referrer: "https://admin-portal.example.com/landing",
    // Optional IP sometimes included
    ip: undefined,
  } satisfies IDiscussionBoardAdmin.IJoin;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(adminAuth);

  // 2. Query for soft-deleted attachments only
  const reqBody = {
    deleted: true,
  } satisfies IDiscussionBoardAttachment.IRequest;
  const page = await api.functional.discussionBoard.admin.attachments.index(
    connection,
    { body: reqBody },
  );
  typia.assert(page);

  // 3. Validate all returned records have deleted_at set (not null/undefined)
  for (const file of page.data) {
    TestValidator.predicate(
      "attachment must be soft-deleted (deleted_at NOT null)",
      file.deleted_at !== null && file.deleted_at !== undefined,
    );
  }

  // 4. Optionally, check that there are no non-deleted attachments (redundant as above)
  TestValidator.predicate(
    "no active attachments returned in deleted-only filter",
    page.data.every(
      (file) => file.deleted_at !== null && file.deleted_at !== undefined,
    ),
  );
}
