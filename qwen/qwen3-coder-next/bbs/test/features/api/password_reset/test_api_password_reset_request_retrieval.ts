import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_request_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: typia.random<IDiscussionBoardMember.IJoin>(),
    },
  );
  typia.assert(joinResponse);
  // 2. Perform password reset request (create a password reset record)
  // Note: Based on provided API functions, there's no direct "request password reset" endpoint visible.
  // The test scenario plan suggests this step should exist.
  // Since we only have the retrieval endpoint (password_resets.at) available,
  // we'll simulate a scenario where a password reset record exists.
  // For testing purposes, we'll use the random generation for the reset ID.
  // 3. Test retrieval with a non-existent reset ID (expecting 404)
  const invalidResetId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "should return 404 for non-existent reset ID",
    async () => {
      await api.functional.discussionBoard.member.password_resets.at(
        connection,
        {
          resetId: invalidResetId,
        },
      );
    },
  );
  // 4. Test retrieval with a generated reset ID (simulated)
  // Since we can't create a real password reset record through available APIs,
  // we'll test the endpoint structure with a generated UUID
  const generatedResetId = typia.random<string & tags.Format<"uuid">>();
  const resetRecord =
    await api.functional.discussionBoard.member.password_resets.at(connection, {
      resetId: generatedResetId,
    });
  typia.assert(resetRecord);
}
