import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const memberData: IEcommerceMallMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://example.com/signup",
        referrer: "https://example.com",
      } satisfies IEcommerceMallMember.IJoin,
    });
  typia.assert(memberData);
  // 2. Create connection for session retrieval - use the same connection with updated token
  const sessionConnection: api.IConnection = { host: connection.host };
  sessionConnection.headers = {
    ...connection.headers,
    Authorization: `Bearer ${memberData.token.access}`,
  };
  // 3. For session retrieval, we need a valid session ID
  // Since the IAuthorized response doesn't include session ID directly,
  // we generate a test session ID for this scenario
  const sessionId: string = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve the session details
  const session: IEcommerceMallGuestSession =
    await api.functional.ecommerceMall.member.sessions.at(sessionConnection, {
      sessionId,
    });
  typia.assert(session);
  // 5. Validate response fields
  TestValidator.equals("session ID matches", session.id, sessionId);
  TestValidator.equals(
    "actor ID matches member ID",
    session.actor_id,
    memberData.id,
  );
  TestValidator.equals("actor type is member", session.actor_type, "member");
  TestValidator.notEquals("has IP address", session.ip, "");
  TestValidator.equals("member ID matches", session.actor_id, memberData.id);
  TestValidator.equals(
    "created_at format valid",
    session.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "expired_at format valid",
    session.expired_at.length > 0,
    true,
  );
}