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

export async function test_api_session_detail_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member connection and register (join)
  // The join operation automatically creates a session and sets Authorization header
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // Step 2: Decode the JWT access token to extract the session ID
  // JWT format: header.payload.signature — we decode the payload (index 1)
  const jwtParts = authorized.token.access.split(".");
  const payloadBase64 = jwtParts[1]!;
  // Replace base64url characters and pad
  const payloadJson = Buffer.from(
    payloadBase64.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf-8");
  const payload = JSON.parse(payloadJson) as Record<string, unknown>;
  // The JWT payload contains the session id as a claim
  const sessionId = (payload["sessionId"] ??
    payload["session_id"] ??
    payload["sub"]) as string & tags.Format<"uuid">;
  TestValidator.predicate(
    "sessionId extracted from JWT",
    sessionId !== undefined && sessionId !== null && sessionId.length > 0,
  );
  // Step 3: Retrieve the session record using the authenticated member connection
  const session = await api.functional.erpHrm.member.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // Step 4: Validate business logic
  // Confirm session ID matches what we requested
  TestValidator.equals(
    "session id matches requested id",
    session.id,
    sessionId,
  );
  // Confirm member email matches registered email
  TestValidator.equals(
    "member email matches registration email",
    session.member.email,
    email,
  );
  // Confirm member ID matches the authorized member's ID
  TestValidator.equals(
    "member id matches authorized member id",
    session.member.id,
    authorized.member.id,
  );
  // Confirm expired_at is after created_at (session validity window)
  TestValidator.predicate(
    "expired_at is after created_at",
    new Date(session.expired_at) > new Date(session.created_at),
  );
  // Step 5: Idempotency check — calling the endpoint again returns the same data
  const sessionAgain = await api.functional.erpHrm.member.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(sessionAgain);
  TestValidator.equals(
    "session data is immutable across calls",
    session.id,
    sessionAgain.id,
  );
  TestValidator.equals(
    "session created_at is immutable",
    session.created_at,
    sessionAgain.created_at,
  );
  TestValidator.equals(
    "session expired_at is immutable",
    session.expired_at,
    sessionAgain.expired_at,
  );
}
