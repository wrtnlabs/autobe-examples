import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: true,
  } satisfies ITodoAppMember.IJoin;
  const output = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "registered email should match request",
    output.email,
    body.email,
  );
  TestValidator.predicate("member id should be present", output.id.length > 0);
  TestValidator.equals(
    "deleted_at should be null for active member",
    output.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at should be a valid timestamp",
    output.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a valid timestamp",
    output.updated_at.length > 0,
  );
  TestValidator.predicate(
    "access token should be issued",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be issued",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at should be a valid timestamp",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until should be a valid timestamp",
    output.token.refreshable_until.length > 0,
  );
}
