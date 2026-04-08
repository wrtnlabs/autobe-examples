import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authorized connection
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create connection for profile update with access token
  const profileConnection: api.IConnection = { host: connection.host };
  profileConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 3. Update display name
  const newDisplayName = RandomGenerator.name(3);
  const response = await api.functional.multiUserTodo.member.profile.update(
    profileConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies IMultiUserTodoMember.IUpdate,
    },
  );
  typia.assert(response);
  // 4. Validate response contains all required member fields
  TestValidator.equals(
    "response id exists",
    response.id !== undefined && response.id.length > 0,
    true,
  );
  TestValidator.equals(
    "response email exists",
    response.email !== undefined && response.email.length > 0,
    true,
  );
  TestValidator.equals(
    "response created_at exists",
    response.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "response updated_at exists",
    response.updated_at !== undefined,
    true,
  );
  // 5. Validate display_name matches the updated value
  TestValidator.equals(
    "display_name updated",
    (response as any).display_name,
    newDisplayName,
  );
  // 6. Validate email matches the registered email
  TestValidator.equals(
    "email matches registration",
    response.email,
    authorized.email,
  );
  // 7. Validate created_at is before updated_at
  TestValidator.predicate(
    "created_at before updated_at",
    new Date(response.created_at) < new Date(response.updated_at),
  );
  // 8. Validate UUID format for id
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );
}