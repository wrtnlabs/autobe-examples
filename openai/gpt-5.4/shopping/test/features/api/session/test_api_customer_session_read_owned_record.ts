import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_read_owned_record(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "$tr0ngPassw0rd!2026",
    href: "https://shoppingmall.example.com/signup?source=e2e",
    referrer: "https://search.example.com/results?q=shoppingmall",
    ip: "203.0.113.10",
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);
  const tokenPayloadSegment = authorized.token.access.split(".")[1] ?? "";
  const tokenPayloadText = Buffer.from(
    tokenPayloadSegment,
    "base64url",
  ).toString("utf8");
  const parsedTokenPayload: unknown = JSON.parse(tokenPayloadText);
  TestValidator.predicate(
    "jwt payload must be an object",
    typeof parsedTokenPayload === "object" && parsedTokenPayload !== null,
  );
  const tokenPayload = parsedTokenPayload as Record<string, unknown>;
  const sessionIdValue =
    typeof tokenPayload.sessionId === "string"
      ? tokenPayload.sessionId
      : typeof tokenPayload.session_id === "string"
        ? tokenPayload.session_id
        : typeof tokenPayload.sid === "string"
          ? tokenPayload.sid
          : typeof tokenPayload.id === "string"
            ? tokenPayload.id
            : null;
  typia.assertGuard<string & tags.Format<"uuid">>(sessionIdValue);
  const sessionId = sessionIdValue;
  const session = await api.functional.shoppingMall.customer.sessions.at(
    customerConnection,
    {
      sessionId,
    },
  );
  typia.assert<IShoppingMallCustomerSession>(session);
  TestValidator.equals(
    "session id matches requested id",
    session.id,
    sessionId,
  );
  TestValidator.equals(
    "session owner id matches authorized customer",
    session.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "session owner email matches authorized customer",
    session.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "session owner banned_at remains null",
    session.customer.banned_at,
    null,
  );
  TestValidator.equals(
    "session owner deleted_at remains null",
    session.customer.deleted_at,
    null,
  );
  TestValidator.equals(
    "session ip matches join context",
    session.ip,
    joinBody.ip,
  );
  TestValidator.equals(
    "session href matches join context",
    session.href,
    joinBody.href,
  );
  TestValidator.equals(
    "session referrer matches join context",
    session.referrer,
    joinBody.referrer,
  );
  const firstCreatedAt = session.created_at;
  const firstExpiredAt = session.expired_at;
  const sessionAgain = await api.functional.shoppingMall.customer.sessions.at(
    customerConnection,
    {
      sessionId,
    },
  );
  typia.assert<IShoppingMallCustomerSession>(sessionAgain);
  TestValidator.equals(
    "second read preserves session id",
    sessionAgain.id,
    session.id,
  );
  TestValidator.equals(
    "second read preserves customer id",
    sessionAgain.customer.id,
    session.customer.id,
  );
  TestValidator.equals(
    "second read preserves customer email",
    sessionAgain.customer.email,
    session.customer.email,
  );
  TestValidator.equals(
    "second read preserves session ip",
    sessionAgain.ip,
    session.ip,
  );
  TestValidator.equals(
    "second read preserves session href",
    sessionAgain.href,
    session.href,
  );
  TestValidator.equals(
    "second read preserves session referrer",
    sessionAgain.referrer,
    session.referrer,
  );
  TestValidator.equals(
    "viewing session does not change created_at",
    sessionAgain.created_at,
    firstCreatedAt,
  );
  TestValidator.equals(
    "viewing session does not change expired_at",
    sessionAgain.expired_at,
    firstExpiredAt,
  );
}
