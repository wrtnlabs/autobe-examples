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
 * Test filtering password reset records by actor type.
 *
 * This test verifies that the password reset query endpoint correctly
 * filters results based on the actorType parameter, distinguishing between
 * member and admin password reset records.
 *
 * Steps:
 * 1. Authenticate as a member via join endpoint
 * 2. Query password resets with actorType='member' filter
 * 3. Query password resets with actorType='admin' filter
 * 4. Query without actorType filter for combined results
 * 5. Validate response structure and verify actor type filtering works
 */
export async function test_api_password_reset_query_by_actor_type_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member connection via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Query password resets with actorType='member' filter
  const memberResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          actorType: "member",
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(memberResult);
  // Step 3: Query password resets with actorType='admin' filter
  const adminResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          actorType: "admin",
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(adminResult);
  // Verify all admin results have admin field populated
  for (const record of adminResult.data) {
    typia.assert(record);
    TestValidator.predicate(
      "admin record should have admin field",
      record.admin !== undefined && record.admin !== null,
    );
  }
  // Step 4: Query without actorType filter for combined results
  const combinedResult =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {} satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Step 5: Verify that combined result includes records from both actor types
  // The combined result should have at least as many records as individual filtered queries
  TestValidator.predicate(
    "combined records should include both member and admin records",
    combinedResult.pagination.records >= memberResult.pagination.records &&
      combinedResult.pagination.records >= adminResult.pagination.records,
  );
}
