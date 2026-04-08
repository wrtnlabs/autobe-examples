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
 * Test clearing a member's display name by setting it to null.
 *
 * Validates the workflow of first setting a display name and then clearing it by setting the display_name field to null. Ensures that the profile update correctly handles null values and that the updated_at timestamp is refreshed on each modification.
 *
 * The test verifies that members can clear their display name at any time and that the system properly handles nullable display name fields without data corruption.
 *
 * 1. Register and authenticate a new member account.
 * 2. Set a display name to establish a non-null initial state.
 * 3. Clear the display name by setting it to null.
 * 4. Validate that display_name is null and updated_at is refreshed.
 */
export async function test_api_member_profile_clear_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(joined);
  // 2. Set a display name to establish initial state
  const initialProfile =
    await api.functional.todoApp.member.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
        } satisfies ITodoAppMember.IUpdate,
      },
    );
  typia.assert(initialProfile);
  // Verify initial display name is set
  TestValidator.predicate(
    "initial display name is set",
    initialProfile.display_name !== null,
  );
  const initialUpdatedAt = initialProfile.updated_at;
  // 3. Clear the display name by setting it to null
  const clearedProfile =
    await api.functional.todoApp.member.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: null,
        } satisfies ITodoAppMember.IUpdate,
      },
    );
  typia.assert(clearedProfile);
  // 4. Validate the cleared profile
  TestValidator.equals(
    "display name is null",
    clearedProfile.display_name,
    null,
  );
  TestValidator.equals(
    "member id unchanged",
    clearedProfile.id,
    initialProfile.id,
  );
  TestValidator.equals(
    "email unchanged",
    clearedProfile.email,
    initialProfile.email,
  );
  TestValidator.equals(
    "created_at unchanged",
    clearedProfile.created_at,
    initialProfile.created_at,
  );
  TestValidator.predicate(
    "updated_at is refreshed",
    clearedProfile.updated_at > initialUpdatedAt,
  );
}
