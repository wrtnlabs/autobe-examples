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

export async function test_api_guest_profile_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Get initial profile
  const initialProfile =
    await api.functional.multiUserTodo.guest.profile.update(guestConnection, {
      body: {
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(),
      } satisfies IMultiUserTodoMember.IUpdate,
    });
  typia.assert(initialProfile);
  // Store initial values for comparison
  const initialName = initialProfile.name;
  const initialNickname = initialProfile.nickname;
  const initialUpdatedAt = initialProfile.updated_at;
  // 3. Update with ONLY name field
  const newName = RandomGenerator.name();
  const updatedWithOnlyName =
    await api.functional.multiUserTodo.guest.profile.update(guestConnection, {
      body: { name: newName } satisfies IMultiUserTodoMember.IUpdate,
    });
  typia.assert(updatedWithOnlyName);
  // 4. Validate name updated, nickname preserved, updated_at changed
  TestValidator.equals(
    "name updated correctly",
    updatedWithOnlyName.name,
    newName,
  );
  TestValidator.equals(
    "nickname preserved",
    updatedWithOnlyName.nickname,
    initialNickname,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedWithOnlyName.updated_at,
    initialUpdatedAt,
  );
  // Store after first update
  const afterNameUpdate = updatedWithOnlyName;
  // 5. Update with ONLY nickname field
  const newNickname = RandomGenerator.name();
  const updatedWithOnlyNickname =
    await api.functional.multiUserTodo.guest.profile.update(guestConnection, {
      body: { nickname: newNickname } satisfies IMultiUserTodoMember.IUpdate,
    });
  typia.assert(updatedWithOnlyNickname);
  // 6. Validate nickname updated, name preserved, updated_at changed again
  TestValidator.equals(
    "nickname updated correctly",
    updatedWithOnlyNickname.nickname,
    newNickname,
  );
  TestValidator.equals(
    "name preserved",
    updatedWithOnlyNickname.name,
    afterNameUpdate.name,
  );
  TestValidator.notEquals(
    "updated_at changed again",
    updatedWithOnlyNickname.updated_at,
    afterNameUpdate.updated_at,
  );
}
