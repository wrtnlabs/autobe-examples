import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_registration_credentials_requirements(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: true,
  } satisfies ITodoAppMember.IJoin;
  const authorized = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body,
    },
  );
  typia.assert(authorized);
  TestValidator.equals(
    "registered email should match request",
    authorized.email,
    body.email,
  );
  TestValidator.predicate(
    "member id should be a non-empty uuid string",
    authorized.id.length > 0,
  );
  TestValidator.equals(
    "new member should be active",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token should be present",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be present",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable until should be present",
    authorized.token.refreshable_until.length > 0,
  );
}
