import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_session_retrieve_own_active_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer via the utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Extract session ID from the JWT refresh token claims
  // The refresh token contains the session ID in its base64-encoded JSON payload
  const payload: Record<string, unknown> = JSON.parse(
    Buffer.from(authorized.token.refresh.split(".")[1]!, "base64").toString(
      "utf8",
    ),
  );
  const sessionId: string = (payload.session_id ??
    payload.jti ??
    payload.sid ??
    payload.sub) as string;
  // 3. Retrieve the session record using its UUID
  const session = await api.functional.eCommerceMall.customer.sessions.at(
    customerConnection,
    { sessionId: sessionId as string & tags.Format<"uuid"> },
  );
  typia.assert(session);
  // 4. Validate session metadata fields
  TestValidator.equals("session ID matches requested ID", session.id, sessionId);
  TestValidator.equals("actor type is customer", session.actorType, "customer");
  TestValidator.equals("actor ID matches customer identity", session.actorId, authorized.id);
  TestValidator.predicate(
    "IP address is a non-empty string",
    () => session.ip.length > 0,
  );
  TestValidator.predicate(
    "href is a non-empty string",
    () => session.href.length > 0,
  );
  TestValidator.predicate(
    "referrer is a string",
    () => typeof session.referrer === "string",
  );
  TestValidator.predicate("createdAt is a valid past date-time", () => {
    const d = new Date(session.createdAt);
    return !isNaN(d.getTime()) && d.getTime() < Date.now();
  });
  TestValidator.predicate(
    "expiredAt is a valid future date-time (active session)",
    () => {
      const d = new Date(session.expiredAt);
      return !isNaN(d.getTime()) && d.getTime() > Date.now();
    },
  );
}