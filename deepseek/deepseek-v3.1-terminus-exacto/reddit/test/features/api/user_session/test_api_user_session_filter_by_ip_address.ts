import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_session_filter_by_ip_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // 2. Generate different IP addresses for testing
  const targetIp = typia.random<string & tags.Format<"ipv4">>();
  const otherIp = typia.random<string & tags.Format<"ipv4">>();
  // 3. Search sessions filtered by target IP
  const filteredSessions =
    await api.functional.communityPlatform.user.sessions.index(userConnection, {
      body: {
        ip: targetIp,
      } satisfies ICommunityPlatformUserSession.IRequest,
    });
  typia.assert(filteredSessions);
  // 4. Validate that all returned sessions match the target IP
  TestValidator.predicate(
    "all sessions should match target IP",
    filteredSessions.data.every((session) => session.ip === targetIp),
  );
  // 5. Validate that sessions contain accurate IP information
  TestValidator.predicate(
    "sessions should contain IP information",
    filteredSessions.data.every(
      (session) =>
        session.ip && typeof session.ip === "string" && session.ip.length > 0,
    ),
  );
  // 6. Validate pagination information
  TestValidator.predicate(
    "pagination should be valid",
    filteredSessions.pagination.current >= 1 &&
      filteredSessions.pagination.limit > 0 &&
      filteredSessions.pagination.records >= 0 &&
      filteredSessions.pagination.pages >= 0,
  );
  // 7. Test with a different IP to ensure filtering works
  const differentIpSessions =
    await api.functional.communityPlatform.user.sessions.index(userConnection, {
      body: {
        ip: otherIp,
      } satisfies ICommunityPlatformUserSession.IRequest,
    });
  typia.assert(differentIpSessions);
  // 8. Validate that sessions with different IP are correctly filtered
  TestValidator.predicate(
    "sessions with different IP should be correctly filtered",
    differentIpSessions.data.every((session) => session.ip === otherIp),
  );
}
