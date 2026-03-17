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

export async function test_api_member_registration_with_optional_nickname(
  connection: api.IConnection,
): Promise<void> {
  // Test Case 1: Register member WITH nickname provided
  const memberConnection1: api.IConnection = { host: connection.host };
  const nickname1 = RandomGenerator.name();
  const authorized1 = await authorize_member_join(memberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      nickname: nickname1,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized1);
  // Verify nickname matches input
  TestValidator.equals("nickname with value", authorized1.nickname, nickname1);
  TestValidator.equals("id is uuid", authorized1.id, authorized1.id);
  TestValidator.predicate("has email", authorized1.email.length > 0);
  TestValidator.predicate("has name", authorized1.name.length > 0);
  TestValidator.predicate("has created_at", authorized1.created_at.length > 0);
  TestValidator.predicate("has updated_at", authorized1.updated_at.length > 0);
  TestValidator.predicate("has token", authorized1.token.access.length > 0);
  // Test Case 2: Register member WITHOUT nickname (null)
  const memberConnection2: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_member_join(memberConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      nickname: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized2);
  // Verify nickname is null when explicitly set to null
  TestValidator.equals("nickname is null", authorized2.nickname, null);
  TestValidator.predicate("has id", authorized2.id.length > 0);
  TestValidator.predicate("has token", authorized2.token.access.length > 0);
  // Test Case 3: Register member WITHOUT nickname (undefined/omitted)
  const memberConnection3: api.IConnection = { host: connection.host };
  const authorized3 = await authorize_member_join(memberConnection3, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized3);
  // Verify nickname is undefined when omitted
  TestValidator.equals(
    "nickname is undefined",
    authorized3.nickname,
    undefined,
  );
  TestValidator.predicate("has id", authorized3.id.length > 0);
  TestValidator.predicate("has token", authorized3.token.access.length > 0);
}
