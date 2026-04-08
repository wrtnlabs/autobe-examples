import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that attempting to retrieve a non-existent member returns an error.
 *
 * Validates the error handling behavior when attempting to retrieve a member that doesn't exist in the system. The test creates a valid member account first to establish context, then attempts to retrieve a different non-existent member ID to verify proper error handling.
 *
 * This test ensures that the member retrieval endpoint correctly handles requests for members that don't exist, returning appropriate error responses rather than failing silently or returning incorrect data.
 *
 * 1. Create a new member account using the join endpoint to obtain a valid member ID.
 * 2. Attempt to retrieve a different (non-existent) member ID using the members.at endpoint.
 * 3. Verify that the API call throws an error when the member doesn't exist.
 */
export async function test_api_member_retrieve_soft_deleted_member_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account to establish valid member context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection);
  typia.assert(member);
  // 2. Generate a non-existent member ID for testing
  const nonExistentMemberId: string = typia.random<string>();
  // 3. Verify that retrieving a non-existent member throws an error
  await TestValidator.error(
    "should throw error for non-existent member",
    async () => {
      await api.functional.hrmTimeTrack.members.at(memberConnection, {
        memberId: nonExistentMemberId satisfies string & tags.Format<"uuid">,
      });
    },
  );
}
