import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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

export async function test_api_seller_profile_customer_missing_profile_unavailable(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validates that a customer cannot load a missing seller profile through the live storefront endpoint.
   *
   * The test creates an authenticated customer connection, then requests a guaranteed non-existent seller profile
   * identifier through the public customer-facing seller profile lookup route. It verifies that the endpoint
   * responds with a not-found style HTTP error rather than exposing substitute, placeholder, or historical data.
   *
   * 1. Authenticate as a customer using the customer join flow.
   * 2. Request a random UUID that is very unlikely to correspond to an existing seller profile.
   * 3. Confirm the live seller profile lookup fails with a 404 not-found response.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await api.functional.mallPlatform.auth.customer.join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const missingSellerProfileId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "missing seller profile should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.customer.sellerProfiles.at(
        customerConnection,
        {
          sellerProfileId: missingSellerProfileId,
        },
      );
    },
  );
}
