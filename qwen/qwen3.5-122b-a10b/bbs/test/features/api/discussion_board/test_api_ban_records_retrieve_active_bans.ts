import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator can retrieve active ban records with pagination.
 * 1. Authenticate as administrator
 * 2. Request ban records with isActive=true filter
 * 3. Validate response structure includes ban summaries with member/admin details
 * 4. Verify pagination metadata is present and correct
 * 5. Confirm unbanned_at is null for active bans
 */
export async function test_api_ban_records_retrieve_active_bans(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: RandomGenerator.pick(["regular", "super"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Request active ban records with pagination
  const result = await api.functional.discussionBoard.admin.ban_records.index(
    adminConnection,
    {
      body: {
        isActive: true,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate ban record structure if any records exist
  if (result.data.length > 0) {
    const firstRecord = result.data[0];
    // Validate ban record fields
    TestValidator.predicate("ban record has id", firstRecord.id !== undefined);
    TestValidator.predicate(
      "ban record has reason",
      firstRecord.reason.length > 0,
    );
    TestValidator.predicate(
      "ban record has banned_at",
      firstRecord.banned_at !== undefined,
    );
    // Active bans must have unbanned_at as null
    TestValidator.equals(
      "active ban has null unbanned_at",
      firstRecord.unbanned_at,
      null,
    );
    // Validate discussionBoardMember summary
    TestValidator.predicate(
      "member has id",
      firstRecord.discussionBoardMember.id !== undefined,
    );
    TestValidator.predicate(
      "member has display_name",
      firstRecord.discussionBoardMember.display_name.length > 0,
    );
    TestValidator.predicate(
      "member has ban_status",
      firstRecord.discussionBoardMember.ban_status !== undefined,
    );
    TestValidator.predicate(
      "member has created_at",
      firstRecord.discussionBoardMember.created_at !== undefined,
    );
    // Validate discussionBoardAdmin summary
    TestValidator.predicate(
      "admin has id",
      firstRecord.discussionBoardAdmin.id !== undefined,
    );
    TestValidator.predicate(
      "admin has display_name",
      firstRecord.discussionBoardAdmin.display_name.length > 0,
    );
    TestValidator.predicate(
      "admin has grade",
      firstRecord.discussionBoardAdmin.grade !== undefined,
    );
    TestValidator.predicate(
      "admin has created_at",
      firstRecord.discussionBoardAdmin.created_at !== undefined,
    );
  }
}
