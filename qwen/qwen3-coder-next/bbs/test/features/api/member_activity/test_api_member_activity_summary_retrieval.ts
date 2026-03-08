import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_activity_summary_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authorized);
  // Retrieve activity summary for authenticated member
  const activitySummary =
    await api.functional.discussionBoard.member.member.activity.at(
      memberConnection,
    );
  typia.assert(activitySummary);
  // Validate structure - all arrays must exist
  TestValidator.equals(
    "banRecords array exists",
    Array.isArray(activitySummary.banRecords),
    true,
  );
  TestValidator.equals(
    "administratorRequests array exists",
    Array.isArray(activitySummary.administratorRequests),
    true,
  );
  TestValidator.equals(
    "sessionActivity array exists",
    Array.isArray(activitySummary.sessionActivity),
    true,
  );
  // Verify new member has empty arrays
  TestValidator.equals(
    "new member has empty banRecords",
    activitySummary.banRecords.length,
    0,
  );
  TestValidator.equals(
    "new member has empty administratorRequests",
    activitySummary.administratorRequests.length,
    0,
  );
  TestValidator.equals(
    "new member has empty sessionActivity",
    activitySummary.sessionActivity.length,
    0,
  );
  // Verify empty arrays case for newly registered member
  TestValidator.equals(
    "empty banRecords for new member",
    activitySummary.banRecords,
    [],
  );
  TestValidator.equals(
    "empty administratorRequests for new member",
    activitySummary.administratorRequests,
    [],
  );
  TestValidator.equals(
    "empty sessionActivity for new member",
    activitySummary.sessionActivity,
    [],
  );
}
