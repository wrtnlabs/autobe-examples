import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentials";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskFlag";

/**
 * Validate that customer join, email verification, and auth credentials detail
 * retrieval can be executed end-to-end, and that the auth credentials detail
 * response structurally conforms to IShoppingMallAuthCredentials.
 *
 * Business context
 *
 * - A customer can register (join) on the shopping mall platform, which creates
 *   both a customer profile and associated auth credentials.
 * - A separate email verification flow can be invoked using an opaque token,
 *   resulting in an authorized customer envelope.
 * - Auth credentials can be inspected via a dedicated detail endpoint that
 *   exposes non-sensitive metadata and risk flags.
 *
 * This test focuses on structural and wiring validation rather than tightly
 * coupling all three steps to the exact same credential, because no API
 * currently exposes the underlying authCredentialsId or a real email
 * verification token issuer.
 *
 * Steps
 *
 * 1. Register a new customer via POST /auth/customer/join.
 * 2. Complete email verification via POST /auth/customer/email/verify using a
 *    random IShoppingMallCustomerAuth.IVerifyEmail payload.
 * 3. Retrieve a single auth credential via GET
 *    /shoppingMall/authCredentials/{authCredentialsId} with a random UUID and
 *    assert that the response conforms to IShoppingMallAuthCredentials.
 */
export async function test_api_auth_credentials_detail_view_after_customer_email_verification(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Verify customer email using a random verification token payload
  const verifyBody = typia.random<IShoppingMallCustomerAuth.IVerifyEmail>();
  const verified: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.email.verify.verifyEmail(connection, {
      body: verifyBody,
    });
  typia.assert(verified);

  // 3. Retrieve a single auth credential by random UUID and
  //    validate its structure
  const authCredentialsId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const credential: IShoppingMallAuthCredentials =
    await api.functional.shoppingMall.authCredentials.at(connection, {
      authCredentialsId,
    });
  typia.assert(credential);
}
