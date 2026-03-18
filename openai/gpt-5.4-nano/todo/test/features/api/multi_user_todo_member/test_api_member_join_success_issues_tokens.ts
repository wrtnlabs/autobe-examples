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

export async function test_api_member_join_success_issues_tokens(
  connection: api.IConnection,
): Promise<void> {
  // Use actor-specific connection for member join
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(joined);
  TestValidator.predicate(
    "member id is non-empty",
    joined.id.trim().length > 0,
  );
  const record = joined as unknown as Record<string, unknown>;
  TestValidator.predicate(
    "no password_hash is leaked",
    record.password_hash === undefined,
  );
  TestValidator.predicate(
    "no session internal identifiers are leaked",
    Object.keys(record).every(
      (k) =>
        k !== "session_id" &&
        k !== "sessionId" &&
        k !== "refresh_token" &&
        k !== "refreshToken",
    ),
  );
}
