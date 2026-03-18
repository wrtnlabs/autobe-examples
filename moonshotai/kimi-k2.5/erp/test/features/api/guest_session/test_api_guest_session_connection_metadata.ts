import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_connection_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated connection for guest actor
  const guestConnection: api.IConnection = { host: connection.host };
  // Define connection metadata to capture during authentication
  const testHref = "https://example.com/guest/onboarding";
  const testReferrer = "https://referrer.com/campaign";
  const testIp = "203.0.113.42";
  // Create guest session with captured metadata
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: testHref,
      referrer: testReferrer,
      ip: testIp,
    } satisfies IErpHrmGuest.IJoin,
  });
  typia.assert(authorized);
  // Retrieve session details to verify captured metadata
  const session = await api.functional.erpHrm.guest.sessions.at(
    guestConnection,
    {
      sessionId: authorized.id,
    },
  );
  typia.assert(session);
  // Verify connection metadata accurately captured
  TestValidator.equals("IP address matches client origin", session.ip, testIp);
  TestValidator.equals(
    "href matches authentication endpoint",
    session.href,
    testHref,
  );
  TestValidator.equals(
    "referrer matches source URL",
    session.referrer,
    testReferrer,
  );
  // Verify session lifecycle - expiration is after creation
  const createdAt = new Date(session.createdAt);
  const expiredAt = new Date(session.expiredAt);
  TestValidator.predicate(
    "session has valid lifecycle duration",
    expiredAt > createdAt,
  );
}
