import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test authenticated member profile display name update.
 *
 * Validates that a signed-in member can update only their own private profile display name.
 * The flow covers member registration, capturing the original private profile state, applying
 * a display name change, and ensuring the returned profile reflects the updated value while
 * preserving the same profile identity and private ownership boundary.
 *
 * 1. Register a new member to establish an authenticated private session.
 * 2. Capture the current profile display name and profile identity.
 * 3. Update the display name through the member profile endpoint.
 * 4. Verify the response reflects the new display name and preserves the same profile identity.
 */
export async function test_api_profile_display_name_update(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  const originalProfile = joined.profile;
  typia.assert(originalProfile);
  const updatedDisplayName = RandomGenerator.name();
  TestValidator.notEquals(
    "display name should change",
    updatedDisplayName,
    originalProfile.display_name,
  );
  const updated = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: updatedDisplayName,
      } satisfies ITodoAppProfile.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "profile id should remain the same",
    updated.id,
    originalProfile.id,
  );
  TestValidator.equals(
    "display name should be updated",
    updated.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "created timestamp should be preserved",
    updated.created_at,
    originalProfile.created_at,
  );
  TestValidator.equals(
    "profile should not be deleted",
    updated.deleted_at,
    null,
  );
}
