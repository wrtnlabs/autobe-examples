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

export async function test_api_member_account_update_ownership_and_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com`,
      password: "password1234",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com`,
      password: "password1234",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member2);
  const member1Snapshot = member1;
  const member2Snapshot = member2;
  await TestValidator.error(
    "should reject updating another member's account",
    async () => {
      await api.functional.todoApp.member.accounts.update(member1Connection, {
        accountId: member2.id,
        body: {
          email: `${RandomGenerator.alphaNumeric(12)}@test.com`,
        } satisfies ITodoAppMember.IUpdate,
      });
    },
  );
  TestValidator.equals(
    "member1 account should remain unchanged after forbidden update",
    member1Snapshot,
    member1,
  );
  TestValidator.equals(
    "member2 account should remain unchanged after forbidden update",
    member2Snapshot,
    member2,
  );
  await TestValidator.error(
    "should reject duplicate email update",
    async () => {
      await api.functional.todoApp.member.accounts.update(member1Connection, {
        accountId: member1.id,
        body: {
          email: member2.email,
        } satisfies ITodoAppMember.IUpdate,
      });
    },
  );
  TestValidator.equals(
    "member1 account should remain unchanged after duplicate email conflict",
    member1Snapshot,
    member1,
  );
  TestValidator.equals(
    "member2 account should remain unchanged after duplicate email conflict",
    member2Snapshot,
    member2,
  );
}
