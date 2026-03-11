import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_retrieve_own_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration to create initial session
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: typia.random<string>() satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies string as string & tags.Format<"ipv4">,
    },
  });
  typia.assert(joinResult);
  // 2. Create connection for session retrieval with authorization token
  const sessionConnection: api.IConnection = { host: connection.host };
  sessionConnection.headers = {
    Authorization: joinResult.token.access,
  };
  // 3. Generate a valid session ID for retrieval
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve the session
  const session = await api.functional.ecommerceMall.customer.sessions.at(
    sessionConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 5. Validate session structure
  TestValidator.equals("session ID format", session.id, sessionId);
  TestValidator.equals("seller ID present", session.seller.id, joinResult.id);
  TestValidator.equals(
    "seller email matches",
    session.seller.email,
    joinResult.email,
  );
  TestValidator.equals(
    "seller approval status present",
    session.seller.approvalStatus,
    "approved",
  );
  TestValidator.equals(
    "seller is suspended",
    session.seller.isSuspended,
    false,
  );
  TestValidator.equals("seller is banned", session.seller.isBanned, false);
  TestValidator.predicate("IP address captured", () => session.ip.length > 0);
  TestValidator.predicate("href present", () => session.href.length > 0);
  TestValidator.predicate(
    "referrer present",
    () => session.referrer.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(session.created_at)),
  );
  TestValidator.predicate(
    "expired_at is in the future (active session)",
    () => new Date(session.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "seller createdAt is valid date-time",
    () => !isNaN(Date.parse(session.seller.createdAt)),
  );
  TestValidator.predicate(
    "seller updatedAt is valid date-time",
    () => !isNaN(Date.parse(session.seller.updatedAt)),
  );
}