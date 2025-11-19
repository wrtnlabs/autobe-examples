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
 * Verify that attachment listing and pagination features work for an
 * authenticated admin.
 *
 * 1. Register a new admin using a random valid email, password, and required
 *    session context fields.
 * 2. Call the PATCH /discussionBoard/admin/attachments endpoint as the admin,
 *    requesting a list of attachments with a specific small limit for
 *    pagination.
 * 3. Assert that the response is paginated and contains the proper structure per
 *    IPageIDiscussionBoardAttachment.
 * 4. If any data exists, check that attachments have both non-null and possible
 *    deleted_at values (active and deleted attachments).
 * 5. Retrieve only deleted attachments by sending deleted:true and verify all
 *    results have deleted_at set.
 * 6. Retrieve only active attachments by sending deleted:false and verify all
 *    results have deleted_at as null or undefined.
 * 7. Optionally, perform further pagination checks by requesting the second page
 *    and comparing data/pagination.
 */
export async function test_api_admin_attachment_list_basic_access(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<8> &
      tags.Format<"password">,
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/login",
    ip: undefined,
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Get first page with small limit
  const pageLimit = 2;
  const basicList =
    await api.functional.discussionBoard.admin.attachments.index(connection, {
      body: {
        limit: pageLimit,
      } satisfies IDiscussionBoardAttachment.IRequest,
    });
  typia.assert(basicList);
  TestValidator.predicate(
    "pagination is valid",
    basicList.pagination &&
      typeof basicList.pagination.current === "number" &&
      basicList.pagination.limit === pageLimit,
  );
  TestValidator.predicate(
    "all records are attachments",
    Array.isArray(basicList.data) &&
      basicList.data.every(
        (a) =>
          typeof a.id === "string" && typeof a.original_filename === "string",
      ),
  );

  // Skip test if there aren't any records to further filter
  if (!basicList.data.length) return;

  // 3. Retrieve only deleted attachments
  const deletedList =
    await api.functional.discussionBoard.admin.attachments.index(connection, {
      body: {
        deleted: true,
      } satisfies IDiscussionBoardAttachment.IRequest,
    });
  typia.assert(deletedList);
  if (deletedList.data.length)
    TestValidator.predicate(
      "all deleted attachments have deleted_at timestamp",
      deletedList.data.every(
        (a) => a.deleted_at !== null && a.deleted_at !== undefined,
      ),
    );

  // 4. Retrieve only active attachments
  const activeList =
    await api.functional.discussionBoard.admin.attachments.index(connection, {
      body: {
        deleted: false,
      } satisfies IDiscussionBoardAttachment.IRequest,
    });
  typia.assert(activeList);
  if (activeList.data.length)
    TestValidator.predicate(
      "all active attachments have no deleted_at",
      activeList.data.every(
        (a) => a.deleted_at === null || a.deleted_at === undefined,
      ),
    );

  // 5. Retrieve page 2 and check pagination changes if available
  if (basicList.pagination.pages >= 2) {
    const page2 = await api.functional.discussionBoard.admin.attachments.index(
      connection,
      {
        body: {
          limit: pageLimit,
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals(
      "pagination current page 2",
      page2.pagination.current,
      2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    );
    TestValidator.notEquals(
      "data should change between page 1 and 2",
      page2.data,
      basicList.data,
    );
  }
}
