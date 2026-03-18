import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_detail_access_denied_for_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A
  const connectionA: api.IConnection = { host: connection.host };
  const authorizedA = await authorize_member_join(connectionA, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorizedA);
  // 2. Register Member B
  const connectionB: api.IConnection = { host: connection.host };
  const authorizedB = await authorize_member_join(connectionB, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorizedB);
  // 3. Decode JWT payload from Member A's access token to get session ID
  // JWT structure: header.payload.signature (base64url encoded)
  const jwtPayload = JSON.parse(
    Buffer.from(authorizedA.token.access.split(".")[1], "base64").toString(
      "utf-8",
    ),
  );
  const sessionAId: string =
    jwtPayload["session_id"] ?? jwtPayload["jti"] ?? jwtPayload["sid"];
  // 4. Verify Member A can successfully access their own session (positive test)
  const sessionA = await api.functional.erpHrm.member.sessions.at(connectionA, {
    sessionId: sessionAId,
  });
  typia.assert(sessionA);
  TestValidator.equals(
    "session belongs to member A",
    sessionA.member.id,
    authorizedA.member.id,
  );
  // 5. Verify Member B CANNOT access Member A's session (403 Forbidden)
  await TestValidator.error(
    "member B cannot access member A's session",
    async () => {
      await api.functional.erpHrm.member.sessions.at(connectionB, {
        sessionId: sessionAId,
      });
    },
  );
}
