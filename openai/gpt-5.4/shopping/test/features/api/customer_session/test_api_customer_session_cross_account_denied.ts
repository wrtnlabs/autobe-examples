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

export async function test_api_customer_session_cross_account_denied(
  connection: api.IConnection,
): Promise<void> {
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const firstAuthorized = await authorize_customer_join(
    firstCustomerConnection,
    {
      body: firstJoinBody,
    },
  );
  typia.assert(firstAuthorized);
  const decodeJwtPayload = (token: string): unknown => {
    const segments = token.split(".");
    const payload = segments[1] ?? "";
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  };
  const firstPayload = decodeJwtPayload(firstAuthorized.token.access);
  const payloadRecord =
    typeof firstPayload === "object" && firstPayload !== null
      ? firstPayload
      : {};
  const sessionCandidates = [
    (
      payloadRecord as {
        sessionId?: unknown;
      }
    ).sessionId,
    (
      payloadRecord as {
        session_id?: unknown;
      }
    ).session_id,
    (
      payloadRecord as {
        sid?: unknown;
      }
    ).sid,
    (
      payloadRecord as {
        id?: unknown;
      }
    ).id,
  ];
  const firstSessionId = sessionCandidates.find(
    (value): value is string =>
      typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
  TestValidator.predicate(
    "first customer session id is derivable from token payload",
    firstSessionId !== undefined,
  );
  if (firstSessionId === undefined)
    throw new Error("Unable to derive customer session id from token payload.");
  const protectedSessionId = typia.assert<string & tags.Format<"uuid">>(
    firstSessionId,
  );
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const secondAuthorized = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: secondJoinBody,
    },
  );
  typia.assert(secondAuthorized);
  TestValidator.notEquals(
    "customers are distinct accounts",
    firstAuthorized.id,
    secondAuthorized.id,
  );
  TestValidator.notEquals(
    "sessions issue distinct access tokens",
    firstAuthorized.token.access,
    secondAuthorized.token.access,
  );
  await TestValidator.httpError(
    "cross-account session lookup is denied",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.sessions.at(
        secondCustomerConnection,
        {
          sessionId: protectedSessionId,
        },
      );
    },
  );
}
