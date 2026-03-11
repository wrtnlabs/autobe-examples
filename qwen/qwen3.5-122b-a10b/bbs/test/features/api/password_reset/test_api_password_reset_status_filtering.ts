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

export async function test_api_password_reset_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to access password reset audit logs
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(auth);
  // 2. Test filtering by status: active
  const activeFilter: IDiscussionBoardAdminPasswordReset.IRequest = {
    type: "member",
    status: "active",
    limit: 10,
    page: 1,
  } satisfies IDiscussionBoardAdminPasswordReset.IRequest;
  const activeResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      { body: activeFilter },
    );
  typia.assert(activeResult);
  // 3. Test filtering by status: used
  const usedFilter: IDiscussionBoardAdminPasswordReset.IRequest = {
    type: "member",
    status: "used",
    limit: 10,
    page: 1,
  } satisfies IDiscussionBoardAdminPasswordReset.IRequest;
  const usedResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      { body: usedFilter },
    );
  typia.assert(usedResult);
  // 4. Test filtering by status: expired
  const expiredFilter: IDiscussionBoardAdminPasswordReset.IRequest = {
    type: "member",
    status: "expired",
    limit: 10,
    page: 1,
  } satisfies IDiscussionBoardAdminPasswordReset.IRequest;
  const expiredResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      { body: expiredFilter },
    );
  typia.assert(expiredResult);
  // 5. Test filtering without status (all records)
  const allFilter: IDiscussionBoardAdminPasswordReset.IRequest = {
    type: "member",
    limit: 10,
    page: 1,
  } satisfies IDiscussionBoardAdminPasswordReset.IRequest;
  const allResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      { body: allFilter },
    );
  typia.assert(allResult);
  // 6. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    allResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    allResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    allResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    allResult.pagination.pages >= 0,
  );
  // 7. Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(allResult.data));
  // 8. Validate record structure when data exists
  if (allResult.data.length > 0) {
    const firstRecord = allResult.data[0];
    typia.assert(firstRecord);
    typia.assert(firstRecord.admin);
    // Validate admin summary structure
    TestValidator.predicate(
      "admin has valid id",
      firstRecord.admin.id !== undefined,
    );
    TestValidator.predicate(
      "admin has display_name",
      firstRecord.admin.display_name !== undefined,
    );
    TestValidator.predicate(
      "admin has grade",
      firstRecord.admin.grade !== undefined,
    );
  }
}
