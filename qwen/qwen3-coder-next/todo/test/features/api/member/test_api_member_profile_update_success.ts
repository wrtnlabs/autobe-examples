import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful profile update for a member.
 * 1. Register a new member account
 * 2. Update the display name via PUT /todoApp/member/profile
 * 3. Verify response includes updated display_name and updated_at timestamp
 */
export async function test_api_member_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppMemberSession.IJoin;
  const registeredMember = await authorize_member_join(connection, {
    body: joinInput,
  });
  typia.assert(registeredMember);
  // 2. Update the member's display name
  const newDisplayName = RandomGenerator.name();
  const updateInput = {
    display_name: newDisplayName,
  } satisfies ITodoAppProfile.IUpdate;
  // Create a new connection with the updated token for profile update
  const profileConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: registeredMember.token.access },
  };
  const updatedProfile = await api.functional.todoApp.member.profile.put(
    profileConnection,
    {
      body: updateInput,
    },
  );
  typia.assert(updatedProfile);
  // 3. Verify response contains updated display name and timestamps
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.predicate(
    "updated_at is more recent than created_at",
    new Date(updatedProfile.updated_at).getTime() >
      new Date(updatedProfile.created_at).getTime(),
  );
  // 4. Verify profile ID matches the authenticated user's profile
  TestValidator.equals(
    "profile ID matches",
    updatedProfile.id,
    registeredMember.user.todo_app_member_id,
  );
}
