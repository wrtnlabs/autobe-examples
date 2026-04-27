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

export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the first member
  const email = typia.random<string & tags.Format<"email">>();
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member1);
  TestValidator.equals("email matches input", member1.email, email);
  // 2. Attempt to register a second member with the same email (should fail with 409)
  await TestValidator.httpError(
    "duplicate email returns 409",
    409,
    async () => {
      await api.functional.todoApp.auth.member.join(
        { host: connection.host } satisfies api.IConnection,
        {
          body: {
            email,
            password: typia.random<string & tags.Format<"password">>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies ITodoAppMember.IJoin,
        },
      );
    },
  );
  // 3. Verify first member's data is unaffected
  TestValidator.equals(
    "first member email still correct",
    member1.email,
    email,
  );
}
