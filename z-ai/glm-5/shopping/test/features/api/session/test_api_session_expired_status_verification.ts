import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActor";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_session_expired_status_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and session
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create administrator account for authorized session query access
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 3. Query session details - use simulation mode to test endpoint behavior
  // In production, session ID would come from JWT claims or session listing endpoint
  // For testing, we verify the endpoint properly returns session data with computed fields
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const session = await api.functional.shoppingMall.customer.sessions.at(
    adminConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 4. Verify session response structure and computed fields
  TestValidator.predicate("session id is valid UUID", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(session.id);
  });
  // Verify actor_type is one of the valid values
  TestValidator.predicate(
    "actor_type is valid",
    () =>
      session.actor_type === "customer" ||
      session.actor_type === "seller" ||
      session.actor_type === "administrator",
  );
  // Verify actor discriminator matches actor_type
  TestValidator.equals(
    "actor.type matches actor_type",
    session.actor.type,
    session.actor_type,
  );
  // Verify temporal fields are valid ISO 8601 timestamps
  TestValidator.predicate("created_at is valid ISO datetime", () => {
    const created = new Date(session.created_at);
    return !isNaN(created.getTime());
  });
  TestValidator.predicate("expired_at is valid ISO datetime", () => {
    const expired = new Date(session.expired_at);
    return !isNaN(expired.getTime());
  });
  // Verify session timing: expired_at should be approximately 24 hours after created_at
  TestValidator.predicate("expired_at is 24 hours after created_at", () => {
    const created = new Date(session.created_at);
    const expired = new Date(session.expired_at);
    const diffHours =
      (expired.getTime() - created.getTime()) / (1000 * 60 * 60);
    return Math.abs(diffHours - 24) < 1;
  });
  // Verify computed expiration fields are boolean
  TestValidator.predicate(
    "is_expired is boolean",
    () => typeof session.is_expired === "boolean",
  );
  TestValidator.predicate(
    "is_active is boolean",
    () => typeof session.is_active === "boolean",
  );
  // Verify is_active is inverse of is_expired
  TestValidator.equals(
    "is_active is inverse of is_expired",
    session.is_active,
    !session.is_expired,
  );
  // Verify computed fields match the specification logic
  TestValidator.predicate("is_expired computation matches spec", () => {
    const now = new Date();
    const expiredAt = new Date(session.expired_at);
    return session.is_expired === now > expiredAt;
  });
  TestValidator.predicate("is_active computation matches spec", () => {
    const now = new Date();
    const expiredAt = new Date(session.expired_at);
    return session.is_active === now <= expiredAt;
  });
  // Verify connection metadata fields are properly typed
  TestValidator.predicate("ip is null or valid IPv4", () => {
    if (session.ip === null) return true;
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
    return ipv4Regex.test(session.ip);
  });
  TestValidator.predicate("href is null or valid URL", () => {
    if (session.href === null) return true;
    try {
      new URL(session.href);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("referrer is null or valid URI", () => {
    if (session.referrer === null) return true;
    try {
      new URL(session.referrer);
      return true;
    } catch {
      return false;
    }
  });
}
