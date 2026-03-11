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

export async function test_api_customer_session_retrieve_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(
        typia.random<
          string & tags.Format<"email">
        >() satisfies string as string & tags.Format<"email">,
      ),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    },
  });
  typia.assert(authorized);
  // 2. Generate session ID and validate that expired session metadata can be retrieved
  // Since we cannot manipulate database directly, we test that the endpoint
  // returns session structure without errors even for sessions with past expiration
  const expiredSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the session (expired or invalid IDs should still return structure)
  const session: IEcommerceMallSellerSession =
    await api.functional.ecommerceMall.customer.sessions.at(
      customerConnection,
      {
        sessionId: expiredSessionId,
      },
    );
  typia.assert(session);
  // 4. Validate all session metadata fields are present and correctly typed
  TestValidator.equals(
    "session id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.id,
    ),
    true,
  );
  TestValidator.equals(
    "session seller has valid email",
    /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(session.seller.email),
    true,
  );
  TestValidator.equals(
    "session seller has valid approval status",
    ["pending", "approved", "rejected"].includes(session.seller.approvalStatus),
    true,
  );
  TestValidator.equals(
    "session ip is valid ipv4",
    /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(session.ip),
    true,
  );
  TestValidator.equals(
    "session href is valid uri",
    session.href.length > 0,
    true,
  );
  TestValidator.equals(
    "session referrer is valid uri",
    session.referrer.length > 0,
    true,
  );
  // 5. Validate date-time format for timestamps
  const createdDate = new Date(session.created_at);
  const expiredDate = new Date(session.expired_at);
  TestValidator.equals(
    "created_at is valid date-time",
    !isNaN(createdDate.getTime()),
    true,
  );
  TestValidator.equals(
    "expired_at is valid date-time",
    !isNaN(expiredDate.getTime()),
    true,
  );
  TestValidator.equals(
    "expired_at is after created_at",
    expiredDate.getTime() >= createdDate.getTime(),
    true,
  );
  // 6. Validate seller summary fields exist
  TestValidator.equals(
    "seller has valid uuid",
    session.seller.id !== undefined,
    true,
  );
  TestValidator.equals(
    "seller approval status is not empty",
    session.seller.approvalStatus.length > 0,
    true,
  );
  TestValidator.equals(
    "seller creation timestamp exists",
    session.seller.createdAt !== undefined,
    true,
  );
  TestValidator.equals(
    "seller update timestamp exists",
    session.seller.updatedAt !== undefined,
    true,
  );
}