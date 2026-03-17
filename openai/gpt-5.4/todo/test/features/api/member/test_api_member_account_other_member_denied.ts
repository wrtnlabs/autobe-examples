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

export async function test_api_member_account_other_member_denied(
  connection: api.IConnection,
): Promise<void> {
  const firstMemberConnection: api.IConnection = {
    host: connection.host,
  };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(firstMember);
  const secondMemberConnection: api.IConnection = {
    host: connection.host,
  };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(secondMember);
  TestValidator.notEquals(
    "distinct members must have different ids",
    firstMember.id,
    secondMember.id,
  );
  await TestValidator.httpError(
    "member cannot read another member account",
    [401, 403, 404],
    async () => {
      await api.functional.todoApp.members.at(firstMemberConnection, {
        memberId: secondMember.id,
      });
    },
  );
}
