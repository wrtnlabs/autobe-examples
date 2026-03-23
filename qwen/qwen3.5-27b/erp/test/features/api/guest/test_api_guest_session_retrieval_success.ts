import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session and obtain authentication context
  const guestConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
      user_agent: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResult);
  // 2. Extract session ID from authorization response
  const sessionId = authResult.id;
  // 3. Retrieve the guest session by ID
  const session = await api.functional.hrmPlatform.guest.sessions.at(
    guestConnection,
    { sessionId },
  );
  typia.assert(session);
  // 4. Validate session structure and business logic
  TestValidator.equals(
    "session ID matches authorization ID",
    session.id,
    sessionId,
  );
  TestValidator.predicate(
    "member identity exists",
    session.member.id !== undefined && session.member.email !== undefined,
  );
  TestValidator.predicate(
    "connection metadata exists",
    session.ip !== undefined &&
      session.href !== undefined &&
      session.referrer !== undefined,
  );
  TestValidator.predicate(
    "session has valid timestamps",
    session.created_at !== undefined && session.expired_at !== undefined,
  );
  // Organization is nullable - validate it's either null or has valid structure
  if (session.organization !== null) {
    TestValidator.predicate(
      "organization has valid structure",
      session.organization.id !== undefined &&
        session.organization.name !== undefined,
    );
  }
}
