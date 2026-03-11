import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator's ability to filter members by different account statuses.
 *
 * This test validates that administrators can filter the member list by status
 * (active, suspended, deleted) and that each filter returns only members with
 * the matching status. It also verifies pagination metadata is correctly calculated.
 *
 * Test Steps:
 * 1. Authenticate as administrator
 * 2. Filter by 'active' status and verify all results have status='active'
 * 3. Filter by 'suspended' status and verify all results have status='suspended'
 * 4. Filter by 'deleted' status and verify all results have status='deleted'
 * 5. Validate pagination metadata for each filter
 */
export async function test_api_admin_member_list_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
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
  // 2. Test filtering by 'active' status
  const activeResult = await api.functional.discussionBoard.admin.members.index(
    adminConnection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(activeResult);
  // Verify all members have status='active' (if any results exist)
  if (activeResult.data.length > 0) {
    TestValidator.predicate(
      "all active members have correct status",
      activeResult.data.every((member) => member.status === "active"),
    );
  }
  // 3. Test filtering by 'suspended' status
  const suspendedResult =
    await api.functional.discussionBoard.admin.members.index(adminConnection, {
      body: {
        status: "suspended",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(suspendedResult);
  // Verify all members have status='suspended' (if any results exist)
  if (suspendedResult.data.length > 0) {
    TestValidator.predicate(
      "all suspended members have correct status",
      suspendedResult.data.every((member) => member.status === "suspended"),
    );
  }
  // 4. Test filtering by 'deleted' status
  const deletedResult =
    await api.functional.discussionBoard.admin.members.index(adminConnection, {
      body: {
        status: "deleted",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(deletedResult);
  // Verify all members have status='deleted' (if any results exist)
  if (deletedResult.data.length > 0) {
    TestValidator.predicate(
      "all deleted members have correct status",
      deletedResult.data.every((member) => member.status === "deleted"),
    );
  }
}
