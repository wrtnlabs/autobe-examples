import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_guest_session_expired_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection for administrative access
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Retrieve a guest session by ID
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const session = await api.functional.erpHrm.member.guest_sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 3. Validate session structure - expired_at is a required field
  TestValidator.predicate(
    "session has expiration timestamp",
    session.expired_at !== null && session.expired_at !== undefined,
  );
  // 4. Verify session is expired (expired_at is in the past)
  const expiredAt = new Date(session.expired_at);
  TestValidator.predicate(
    "session is expired (expired_at in past)",
    expiredAt.getTime() < Date.now(),
  );
  // 5. Confirm session is accessible for audit purposes even when expired
  TestValidator.predicate(
    "session accessible for audit purposes",
    session.id !== null && session.id !== undefined,
  );
}
