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

/**
 * Test that a guest can successfully retrieve their own session details after authenticating.
 * The test should first create a guest session via the join endpoint, then use the returned
 * guest ID to retrieve the complete session record. Validate that the response includes
 * the correct session ID, access token, refresh token, member summary, IP address,
 * href and referrer URLs, creation timestamp, and expiration timestamp.
 */
export async function test_api_guest_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for guest
  const guestConnection: api.IConnection = { host: connection.host };
  // Prepare join body with specific metadata for validation
  const joinBody = {
    deviceFingerprint: RandomGenerator.alphaNumeric(32),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IErpHrmGuest.IJoin;
  // Create guest session and authorize
  const authorized = await authorize_guest_join(guestConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Retrieve session using the guest ID as the session identifier
  const session: IErpHrmMemberSession =
    await api.functional.erpHrm.guest.sessions.at(guestConnection, {
      sessionId: authorized.id,
    });
  typia.assert(session);
  // Validate session fields match the join request and authorization response
  TestValidator.equals(
    "session ID matches authorized guest ID",
    authorized.id,
    session.id,
  );
  TestValidator.equals(
    "access token matches",
    authorized.token.access,
    session.accessToken,
  );
  TestValidator.equals(
    "refresh token matches",
    authorized.token.refresh,
    session.refreshToken,
  );
  TestValidator.equals(
    "expiration timestamp matches",
    authorized.token.expired_at,
    session.expiredAt,
  );
  TestValidator.equals(
    "href matches join request",
    joinBody.href,
    session.href,
  );
  TestValidator.equals(
    "referrer matches join request",
    joinBody.referrer,
    session.referrer,
  );
  // Validate member summary exists with required fields
  TestValidator.predicate("member exists", !!session.member);
  TestValidator.predicate("member ID exists", !!session.member.id);
  TestValidator.predicate("member email exists", !!session.member.email);
  // Validate timestamps and IP are present
  TestValidator.predicate("createdAt exists", !!session.createdAt);
  TestValidator.predicate("IP address captured", !!session.ip);
}
