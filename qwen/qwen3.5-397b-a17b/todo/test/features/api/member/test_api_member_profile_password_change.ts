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

export async function test_api_member_profile_password_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account with known credentials
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "InitialPassword123!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Store initial state for comparison
  const initialUpdatedAt = memberAuth.updated_at;
  const initialDisplayName = memberAuth.display_name;
  const memberId = memberAuth.id;
  // 3. Create a new connection with the member's authorization token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 4. Update member profile with new password (partial update - password only)
  const newPassword = "NewSecurePassword456!";
  const updated = await api.functional.todoApp.members.update(
    memberConnection,
    {
      memberId: memberId,
      body: {
        password: newPassword,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 5. Validate business logic
  TestValidator.equals("member ID unchanged", updated.id, memberId);
  TestValidator.equals("email unchanged", updated.email, memberAuth.email);
  TestValidator.equals(
    "display_name unchanged",
    updated.display_name,
    initialDisplayName,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updated.updated_at,
    initialUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at is later",
    updated.updated_at > initialUpdatedAt,
  );
  TestValidator.predicate(
    "password_hash not exposed",
    !("password_hash" in updated),
  );
}
