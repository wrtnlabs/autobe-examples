import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import type { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a guest user with known input values for subsequent validation
  const guestConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const authorized: IHrmTimeTrackingGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        email,
        href,
        referrer,
        ip,
      },
    });
  typia.assert(authorized);
  // 2. Extract session_id from JWT access token payload
  const jwtParts: string[] = authorized.token.access.split(".");
  const payloadBase64: string = jwtParts[1];
  const decodedPayload: {
    session_id: string;
  } = JSON.parse(Buffer.from(payloadBase64, "base64").toString("utf-8"));
  const sessionId: string & tags.Format<"uuid"> =
    decodedPayload.session_id as string & tags.Format<"uuid">;
  // 3. Retrieve the member session by its ID
  const session: IHrmTimeTrackingMemberSession =
    await api.functional.hrmTimeTracking.guest.sessions.at(guestConnection, {
      sessionId,
    });
  typia.assert(session);
  // 4. Validate session fields against the original registration input
  TestValidator.equals("session id matches JWT session_id", session.id, sessionId);
  TestValidator.equals("session ip matches registration ip", session.ip, ip);
  TestValidator.equals("session href matches registration href", session.href, href);
  TestValidator.equals("session referrer matches registration referrer", session.referrer, referrer);
  TestValidator.equals("member email matches registration email", session.member.email, email);
  TestValidator.predicate(
    "created_at is a valid ISO date string",
    () => !isNaN(Date.parse(session.created_at)),
  );
  TestValidator.predicate(
    "expired_at is a valid ISO date string",
    () => !isNaN(Date.parse(session.expired_at)),
  );
  TestValidator.predicate(
    "expired_at is after created_at (30-day session validity)",
    () =>
      new Date(session.expired_at).getTime() >
      new Date(session.created_at).getTime(),
  );
}
