import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_reset_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create member account for testing password reset filtering
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // Test 1: Filter password resets by "pending" status for this member
  const pendingFilter: IDiscussionBoardMemberPasswordReset.IRequest = {
    discussion_board_member_id: member.id,
    status: "pending",
    page: 1,
    limit: 10,
  };
  const pendingResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: pendingFilter,
      },
    );
  typia.assert(pendingResult);
  // Verify response structure
  TestValidator.predicate(
    "pending result has pagination",
    typeof pendingResult.pagination === "object",
  );
  TestValidator.predicate(
    "pending result has data array",
    Array.isArray(pendingResult.data),
  );
  // Test 2: Filter password resets by "expired" status for this member
  const expiredFilter: IDiscussionBoardMemberPasswordReset.IRequest = {
    discussion_board_member_id: member.id,
    status: "expired",
    page: 1,
    limit: 10,
  };
  const expiredResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: expiredFilter,
      },
    );
  typia.assert(expiredResult);
  TestValidator.predicate(
    "expired result has pagination",
    typeof expiredResult.pagination === "object",
  );
  TestValidator.predicate(
    "expired result has data array",
    Array.isArray(expiredResult.data),
  );
  // Test 3: Filter password resets by "used" status for this member
  const usedFilter: IDiscussionBoardMemberPasswordReset.IRequest = {
    discussion_board_member_id: member.id,
    status: "used",
    page: 1,
    limit: 10,
  };
  const usedResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: usedFilter,
      },
    );
  typia.assert(usedResult);
  TestValidator.predicate(
    "used result has pagination",
    typeof usedResult.pagination === "object",
  );
  TestValidator.predicate(
    "used result has data array",
    Array.isArray(usedResult.data),
  );
  // Test 4: No status filter (should return all password resets for this member)
  const allFilter: IDiscussionBoardMemberPasswordReset.IRequest = {
    discussion_board_member_id: member.id,
    page: 1,
    limit: 100,
  };
  const allResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: allFilter,
      },
    );
  typia.assert(allResult);
  // Verify total count consistency
  const total =
    pendingResult.data.length +
    expiredResult.data.length +
    usedResult.data.length;
  TestValidator.predicate(
    "total count consistency",
    allResult.data.length >= total,
  );
}
