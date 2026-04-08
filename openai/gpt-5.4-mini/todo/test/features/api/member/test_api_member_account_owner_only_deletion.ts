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

export async function test_api_member_account_owner_only_deletion(
  connection: api.IConnection,
): Promise<void> {
  const firstConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(firstMember);
  const secondConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(secondMember);
  TestValidator.notEquals(
    "member sessions should belong to different accounts",
    firstMember.id,
    secondMember.id,
  );
  TestValidator.notEquals(
    "member emails should be distinct",
    firstMember.email,
    secondMember.email,
  );
  TestValidator.notEquals(
    "member profiles should be distinct",
    firstMember.profile.id,
    secondMember.profile.id,
  );
  await api.functional.todoApp.member.accounts.erase(firstConnection, {
    body: {} satisfies ITodoAppMember.IRequest,
  });
  await api.functional.todoApp.member.accounts.erase(secondConnection, {
    body: {} satisfies ITodoAppMember.IRequest,
  });
}
