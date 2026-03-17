import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_get_other_members_session_denied(
  connection: api.IConnection,
): Promise<void> {
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstAuthorized = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(firstAuthorized);
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondAuthorized = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(secondAuthorized);
  TestValidator.notEquals(
    "members must be distinct",
    firstAuthorized.id,
    secondAuthorized.id,
  );
  TestValidator.notEquals(
    "access tokens must be distinct",
    firstAuthorized.token.access,
    secondAuthorized.token.access,
  );
  await TestValidator.httpError(
    "member cannot access inaccessible session resource",
    [403, 404],
    async () => {
      await api.functional.todoApp.member.sessions.at(secondMemberConnection, {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
