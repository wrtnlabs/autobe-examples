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
 * Test updating a member's display name twice in succession and verifying each update is independently recorded.
 *
 * Validates that the profile update endpoint correctly persists each modification and accurately tracks the most recent modification time through the updated_at timestamp. The test confirms that consecutive updates to the same field produce distinct results, the display_name is faithfully reflected in each response, and the updated_at field advances chronologically.
 *
 * ISO 8601 date-time strings stored in UTC sort lexicographically in chronological order, so a simple string comparison suffices to verify that the second update's timestamp is later than the first.
 *
 * 1. Register and authenticate a new member via the join utility function.
 * 2. Update the display name to "First Update" and capture the response with its updated_at timestamp.
 * 3. Update the display name to "Second Update" and capture the response.
 * 4. Verify the first update returned "First Update" as the display_name.
 * 5. Verify the second update returned "Second Update" as the display_name.
 * 6. Verify the second update's updated_at is chronologically after the first update's timestamp.
 */
export async function test_api_member_profile_display_name_update_multiple(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. First display name update
  const firstUpdate = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: "First Update",
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // 3. Second display name update
  const secondUpdate = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: "Second Update",
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // 4. Verify first update display name
  TestValidator.equals(
    "first update display name",
    firstUpdate.display_name,
    "First Update",
  );
  // 5. Verify second update display name
  TestValidator.equals(
    "second update display name",
    secondUpdate.display_name,
    "Second Update",
  );
  // 6. Verify updated_at advanced chronologically
  // ISO 8601 date-time strings in UTC sort lexicographically in chronological order
  TestValidator.predicate(
    "second update timestamp is after first",
    secondUpdate.updated_at > firstUpdate.updated_at,
  );
}
