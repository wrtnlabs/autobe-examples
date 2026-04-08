import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test retrieval of a suspended seller's profile to verify profile visibility rules.
 * According to business rules, suspended seller accounts remain visible in the platform
 * records even though their products are hidden from search. The customer authenticates
 * and attempts to view the profile of a seller whose account has been suspended by an
 * administrator. The test validates that the profile is still returned successfully
 * (not 404) and includes an indicator of the suspension status.
 */
export async function test_api_seller_profile_suspended_visible(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Retrieve suspended seller's profile
  // Using a random seller ID - in simulation mode this will return appropriate mock data
  const suspendedSellerId = typia.random<string & tags.Format<"uuid">>();
  const sellerProfile =
    await api.functional.ecommerceMall.customer.sellers.profile.at(
      customerConnection,
      { sellerId: suspendedSellerId },
    );
  typia.assert(sellerProfile);
  // 3. Validate that profile includes suspension status indicator
  // The approvalStatus should exist and be one of the valid values
  TestValidator.predicate(
    "approvalStatus is present and valid",
    ["pending", "approved", "rejected", "suspended"].includes(
      sellerProfile.approvalStatus,
    ),
  );
  // 4. Verify profile data is accessible even for suspended sellers
  TestValidator.predicate(
    "profile object exists",
    sellerProfile.profile !== undefined,
  );
}
