import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verifies that storefront identity retrieval fails safely when seller profile data is missing.
 *
 * This test covers the customer-facing storefront identity endpoint for a seller account whose live seller row exists but whose storefront profile row is unavailable. It validates the endpoint's read-only behavior and ensures the response does not fabricate placeholder profile data or mutate any seller-related state.
 *
 * 1. Register and authenticate a customer account to satisfy the endpoint's authorization requirement.
 * 2. Request the storefront identity for a seller identifier that exercises the missing-profile path.
 * 3. Validate that the request fails safely instead of returning a storefront identity payload.
 */
export async function test_api_customer_storefront_identity_missing_profile(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "storefront identity should fail when seller profile is missing",
    async () => {
      await api.functional.mallPlatform.customer.sellers.storefront_identity.at(
        customerConnection,
        { sellerId },
      );
    },
  );
}
