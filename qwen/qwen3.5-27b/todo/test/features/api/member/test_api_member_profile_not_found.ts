import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that attempting to retrieve a non-existent member profile returns 404 Not Found error.
 *
 * Validates the error handling when accessing a member profile that doesn't exist in the system. The test registers a valid member account, then attempts to retrieve a profile using a randomly generated UUID that doesn't correspond to any existing member. This ensures the system properly returns 404 errors for non-existent resources and that the soft-delete filter (deleted_at IS NULL) works correctly.
 *
 * 1. Register and authenticate a new member account for test isolation.
 * 2. Generate a valid UUID format member ID that doesn't exist in the system.
 * 3. Attempt to retrieve the profile using the non-existent member ID.
 * 4. Verify the API throws an HttpError with status code 404.
 * 5. Confirm the error response indicates the member was not found.
 */
export async function test_api_member_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member account for test isolation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a valid UUID format member ID that doesn't exist
  const nonExistentMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3-5. Attempt to retrieve non-existent profile and verify 404 error
  await TestValidator.httpError(
    "non-existent member returns 404",
    404,
    async () =>
      await api.functional.todoApp.members.at(memberConnection, {
        memberId: nonExistentMemberId,
      }),
  );
}
