import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest profile update with name and nickname.
 *
 * A registered guest user successfully updates their profile information by
 * providing both a new display name and nickname. The system validates that
 * at least one updatable field is present, ensures the name is not empty,
 * updates the updated_at timestamp, and returns the complete updated member
 * profile with all fields.
 *
 * This validates the primary success path for profile modification.
 */
export async function test_api_guest_profile_update_with_name_and_nickname(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(auth);
  // 2. Prepare profile update with both name and nickname
  const newName = RandomGenerator.name();
  const newNickname = RandomGenerator.name();
  // 3. Update profile
  const updated = await api.functional.multiUserTodo.guest.profile.update(
    guestConnection,
    {
      body: {
        name: newName,
        nickname: newNickname,
      } satisfies IMultiUserTodoMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 4. Validate response
  TestValidator.equals("name updated", updated.name, newName);
  TestValidator.equals("nickname updated", updated.nickname, newNickname);
  TestValidator.equals("member id matches", updated.id, auth.id);
  TestValidator.equals("email preserved", updated.email, auth.email);
  TestValidator.predicate("has created_at", updated.created_at !== undefined);
  TestValidator.predicate("has updated_at", updated.updated_at !== undefined);
  TestValidator.predicate("account is active", updated.deleted_at === null);
}
