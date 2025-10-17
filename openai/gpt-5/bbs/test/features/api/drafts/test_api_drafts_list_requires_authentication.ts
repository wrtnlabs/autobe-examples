import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostDraft";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostDraft";

/**
 * Validate authentication boundary for member draft listing.
 *
 * Business goal: ensure private draft listing is inaccessible without
 * authentication while succeeding for an authenticated member, returning a
 * paginated container.
 *
 * Steps:
 *
 * 1. Try listing drafts without Authorization using a cloned unauthenticated
 *    connection; expect an error.
 * 2. Join as a member (register) to obtain tokens; SDK attaches Authorization to
 *    the original connection.
 * 3. List drafts again with the authenticated connection; validate the response
 *    shape.
 */
export async function test_api_drafts_list_requires_authentication(
  connection: api.IConnection,
) {
  // 1) Unauthenticated call must be rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated request should be rejected when listing drafts",
    async () => {
      await api.functional.econDiscuss.member.drafts.search(unauthConn);
    },
  );

  // 2) Register (join) as a member to obtain Authorization
  const joinBody = typia.random<IEconDiscussMember.ICreate>();
  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 3) Authenticated call must succeed and return paginated drafts
  const page: IPageIEconDiscussPostDraft =
    await api.functional.econDiscuss.member.drafts.search(connection);
  typia.assert(page);
}
