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
 * Test administrator member list retrieval with default pagination.
 *
 * This test validates that administrators can successfully retrieve the member list
 * using default pagination settings. It verifies:
 * 1. Admin authentication works correctly
 * 2. Default pagination parameters (page=1, limit=20, sort=desc) are applied
 * 3. Response structure matches IPageIDiscussionBoardMember.ISummary
 * 4. All member records contain required fields including is_admin flag
 * 5. Results are sorted by created_at in descending order (newest first)
 */
export async function test_api_admin_member_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
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
  // 2. Call member list endpoint with empty body for default pagination
  const memberList = await api.functional.discussionBoard.admin.members.index(
    adminConnection,
    {
      body: {} satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(memberList);
  // 3. Verify pagination metadata
  TestValidator.equals("current page is 1", memberList.pagination.current, 1);
  TestValidator.equals("default limit is 20", memberList.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    memberList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    memberList.pagination.pages >= 0,
  );
  // 4. Verify data array exists
  TestValidator.predicate("data array exists", Array.isArray(memberList.data));
  // 5. Verify each member record structure (typia.assert validates all required fields)
  for (const member of memberList.data) {
    typia.assert(member);
  }
  // 6. Verify sorting order (created_at descending - newest first)
  if (memberList.data.length > 1) {
    for (let i = 0; i < memberList.data.length - 1; i++) {
      const current = new Date(memberList.data[i].created_at).getTime();
      const next = new Date(memberList.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `member ${i} is newer than or equal to member ${i + 1}`,
        current >= next,
      );
    }
  }
  // 7. Verify admin account has is_admin flag set to true
  const adminMember = memberList.data.find((m) => m.id === adminAuth.member.id);
  if (adminMember) {
    TestValidator.equals(
      "admin account has is_admin flag",
      adminMember.is_admin,
      true,
    );
  }
}
