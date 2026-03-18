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

export async function test_api_member_join_duplicate_email_normalized_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection1: api.IConnection = { host: connection.host };
  const baseEmail = typia.random<string & tags.Format<"email">>();
  const normalizedEmail = baseEmail.trim().toLowerCase();
  const variantEmail = `  ${baseEmail.toUpperCase()}   `;
  const password = true;
  const first = await authorize_member_join(memberConnection1, {
    body: {
      email: variantEmail satisfies IMultiUserTodoMember.IJoin["email"],
      password,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(first);
  const memberConnection2: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate normalized email rejected",
    [400, 409, 422],
    async () => {
      try {
        await authorize_member_join(memberConnection2, {
          body: {
            email: normalizedEmail,
            password,
          } satisfies IMultiUserTodoMember.IJoin,
        });
      } catch (exp) {
        throw exp;
      }
    },
  );
}
