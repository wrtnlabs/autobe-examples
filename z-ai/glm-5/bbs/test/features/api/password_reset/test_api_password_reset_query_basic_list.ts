import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminPasswordReset";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the basic password reset query functionality with pagination.
 *
 * Steps:
 * 1. Authenticate as a member via join endpoint
 * 2. Call the password reset query endpoint with basic pagination parameters (page=1, limit=20)
 * 3. Verify the response contains pagination metadata
 * 4. Verify each record structure includes id, token, expiredAt, createdAt, and admin object
 * 5. Verify records are sorted by created_at descending
 * 6. Handle empty results gracefully
 */
export async function test_api_password_reset_query_basic_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member via join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Call the password reset query endpoint with basic pagination
  const result =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(result);
  // 3. Verify pagination metadata
  TestValidator.predicate(
    "pagination current is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 20",
    result.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Verify each record structure with typia.assert
  if (result.data.length > 0) {
    for (const record of result.data) {
      typia.assert(record);
    }
    // 5. Verify sorting order (descending by createdAt)
    for (let i = 0; i < result.data.length - 1; i++) {
      const current = new Date(result.data[i].createdAt).getTime();
      const next = new Date(result.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `records sorted descending by createdAt at index ${i}`,
        current >= next,
      );
    }
  } else {
    // 6. Handle empty results gracefully
    TestValidator.predicate(
      "empty data array handled",
      result.data.length === 0,
    );
    TestValidator.predicate(
      "zero total records for empty",
      result.pagination.records === 0,
    );
  }
}
