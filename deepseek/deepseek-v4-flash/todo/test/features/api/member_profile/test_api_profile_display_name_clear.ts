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

export async function test_api_profile_display_name_clear(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with an initial display name
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: "Initial Name",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Clear the display name by setting it to null
  const updated = await api.functional.todoApp.members.update(
    memberConnection,
    {
      body: {
        display_name: null,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 3. Verify display_name is null
  TestValidator.equals("display_name cleared", updated.display_name, null);
  // 4. Verify that non-updated fields remain unchanged
  TestValidator.equals("id unchanged", updated.id, authorized.id);
  TestValidator.equals("email unchanged", updated.email, authorized.email);
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    authorized.created_at,
  );
  // 5. Verify updated_at has changed
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    authorized.updated_at,
  );
}
