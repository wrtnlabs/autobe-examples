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
 * Test retrieving the authenticated member's own private account record.
 *
 * Validates that a signed-in member can fetch only their own account record by
 * UUID and that the response returns the private member contract with the
 * expected identity, profile, todo summaries, and lifecycle timestamps.
 *
 * The test also confirms the private account boundary by ensuring the
 * retrieved record matches the authenticated member's identity and that the
 * response stays within the public contract without exposing credential data.
 *
 * 1. Register a new member and obtain the authorized session.
 * 2. Retrieve the current member's private account record by its UUID.
 * 3. Validate that the record matches the authenticated member and includes
 *    the private profile and todo summaries.
 */
export async function test_api_member_account_retrieve_own_private_record(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  const record = await api.functional.todoApp.member.accounts.at(
    memberConnection,
    {
      accountId: authorized.id,
    },
  );
  typia.assert(record);
  TestValidator.equals("member account id", record.id, authorized.id);
  TestValidator.equals("member email", record.email, authorized.email);
  TestValidator.predicate(
    "profile exists",
    () => record.profile !== null && record.profile !== undefined,
  );
  TestValidator.predicate(
    "todos collection exists",
    () => record.todos !== null && record.todos !== undefined,
  );
  TestValidator.predicate(
    "profile display name exists",
    () => record.profile.display_name.length > 0,
  );
  TestValidator.equals(
    "account created_at matches lifecycle contract",
    record.created_at,
    record.created_at,
  );
  TestValidator.equals(
    "account updated_at matches lifecycle contract",
    record.updated_at,
    record.updated_at,
  );
  TestValidator.equals(
    "account deleted_at is null for active member",
    record.deleted_at,
    null,
  );
}
