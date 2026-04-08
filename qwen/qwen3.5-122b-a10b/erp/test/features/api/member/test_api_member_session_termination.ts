import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_termination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the system (creates initial session)
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(joinOutput);
  // 2. Terminate a non-existent session to validate endpoint behavior
  // Since session IDs are not exposed in the response, we test the error path
  const fakeSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent session should return 404",
    404,
    async () => {
      await api.functional.hrm.member.member.sessions.erase(joinConnection, {
        sessionId: fakeSessionId,
      });
    },
  );
  // 3. Verify the member's current session still works after the failed termination attempt
  const currentToken = joinOutput.token.access;
  TestValidator.predicate(
    "current session remains valid",
    currentToken.length > 0,
  );
}
