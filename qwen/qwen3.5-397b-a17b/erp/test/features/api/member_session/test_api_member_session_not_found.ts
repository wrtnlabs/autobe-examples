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
 * Test that the system properly handles retrieval of a non-existent session.
 *
 * After authenticating as a member, attempt to retrieve session details using
 * a valid UUID format session ID that does not exist in the system. The system
 * should return a 404 HTTP error indicating the session was not found. This
 * validates the business rule that only existing sessions can be retrieved and
 * prevents information leakage about session existence patterns.
 */
export async function test_api_member_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to establish valid authentication context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Generate a valid UUID that doesn't exist in the system
  const nonExistentSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent session - should return 404
  await TestValidator.httpError(
    "non-existent session should return 404",
    404,
    async () => {
      await api.functional.hrmPlatform.member.sessions.at(memberConnection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
