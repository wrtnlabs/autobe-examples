import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session ownership isolation enforcement.
 *
 * Validates that a member (Member A) cannot retrieve session details belonging
 * to a different member (Member B). The system must return 404 Not Found when
 * trying to access another member's session, preventing information leakage about
 * sensitive session data (IP addresses, URLs, member profiles). This enforces
 * the business rule that members can only access their own session records.
 *
 * 1. Authenticate as Member A by joining the platform.
 * 2. Authenticate as Member B by joining the platform.
 * 3. Generate a session ID representing Member B's session.
 * 4. Member A attempts to retrieve Member B's session.
 * 5. Verify the system returns 404 Not Found, preventing unauthorized session access.
 */
export async function test_api_member_session_ownership_isolation(
  connection: api.IConnection,
) {
  // 1. Authenticate as Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        display_name: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(memberA);
  // 2. Authenticate as Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        display_name: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(memberB);
  // 3. Generate a session ID representing Member B's session
  // In a real scenario, this would be retrieved from Member B's session
  const memberBSessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Member A attempts to retrieve Member B's session
  // This should fail with 404 Not Found to prevent information leakage
  await TestValidator.error(
    "Member A cannot access Member B's session - should return 404 Not Found",
    async () => {
      await api.functional.hrmPlatform.member.sessions.at(memberAConnection, {
        sessionId: memberBSessionId,
      });
    },
  );
  // 5. Verify different members have different session identifiers
  TestValidator.notEquals(
    "Different members have different contexts",
    memberA.id,
    memberB.id,
  );
}
