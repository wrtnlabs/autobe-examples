import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_customer_account_self_retrieval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer self account retrieval from the session-scoped account endpoint.
   *
   * This scenario validates that a logged-in customer can read only their own current
   * account record, including persisted identity and lifecycle state.
   *
   * 1. Register and authenticate a customer in a dedicated customer connection.
   * 2. Retrieve the current customer account from the session-scoped endpoint.
   * 3. Validate that the response matches the authenticated customer identity and current state.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/customer/join",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customerAuthorized);
  const customerAccountConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerAuthorized.token.access },
  };
  const selfAccount = await api.functional.mallPlatform.seller.account.at(
    customerAccountConnection,
  );
  typia.assert(selfAccount);
  TestValidator.equals(
    "customer account id matches authenticated identity",
    selfAccount.id,
    customerAuthorized.id,
  );
  TestValidator.equals(
    "customer account email matches authenticated identity",
    selfAccount.email,
    customerAuthorized.email,
  );
  TestValidator.equals(
    "customer account status matches authenticated identity",
    selfAccount.status,
    customerAuthorized.status,
  );
  TestValidator.equals(
    "customer account created_at matches authenticated identity",
    selfAccount.created_at,
    customerAuthorized.created_at,
  );
  TestValidator.equals(
    "customer account updated_at matches authenticated identity",
    selfAccount.updated_at,
    customerAuthorized.updated_at,
  );
  TestValidator.equals(
    "customer account deleted_at matches authenticated identity",
    selfAccount.deleted_at,
    customerAuthorized.deleted_at,
  );
}
