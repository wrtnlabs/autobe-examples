import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_user_profile_display_name_update_trims_and_persists(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that updating a member profile display name trims whitespace, persists the change,
   * and refreshes audit timestamps while staying scoped to the authenticated profile.
   *
   * Validates the full flow of:
   * 1) Joining as an authenticated member.
   * 2) Updating display_name with leading/trailing whitespace and verifying trimming.
   * 3) Updating again and verifying persistence and updated_at increases.
   * 4) Ensuring the profile identifiers returned by both updates remain identical and match
   *    the authenticated principal.
   */
  // 1. Create/authenticate an authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(authorized);
  // 2. Update with whitespace-padded display_name
  const firstUpdated = await api.functional.multiUserTodo.member.profile.put(
    memberConnection,
    {
      body: {
        display_name: "  Alice  ",
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(firstUpdated);
  // 3. Update again with different whitespace-padded display_name
  const secondUpdated = await api.functional.multiUserTodo.member.profile.put(
    memberConnection,
    {
      body: {
        display_name: "  Bob  ",
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(secondUpdated);
  // 4. Validate trimming/persistence, identity scoping, and updated_at refresh
  TestValidator.equals(
    "display_name trimmed after first update",
    firstUpdated.display_name,
    "Alice",
  );
  TestValidator.equals(
    "display_name trimmed after second update",
    secondUpdated.display_name,
    "Bob",
  );
  TestValidator.equals(
    "profile id matches authorized",
    firstUpdated.id,
    authorized.id,
  );
  TestValidator.equals(
    "owning user id matches authorized",
    firstUpdated.multi_user_todo_user_id,
    authorized.multi_user_todo_user_id,
  );
  TestValidator.equals(
    "profile id remains identical across updates",
    secondUpdated.id,
    firstUpdated.id,
  );
  TestValidator.equals(
    "owning user id remains identical across updates",
    secondUpdated.multi_user_todo_user_id,
    firstUpdated.multi_user_todo_user_id,
  );
  TestValidator.predicate(
    "updated_at should increase after second update",
    new Date(secondUpdated.updated_at).getTime() >
      new Date(firstUpdated.updated_at).getTime(),
  );
}
