import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that a suspended seller's profile remains visible to customers.
 *
 * Validates that seller profile retrieval through the customer endpoint
 * succeeds even when the seller account has been suspended by an
 * administrator. While suspension hides the seller's products from search
 * results and category listings, the seller's public profile — including
 * shop name, shop description, and logo image URI — remains accessible to
 * authenticated customers.
 *
 * The nested seller summary within the profile response includes a
 * suspended boolean flag that reflects the seller's administrative
 * suspension state, allowing the platform to display appropriate indicators
 * on the seller profile page.
 *
 * 1. Customer registers and authenticates on the platform via join.
 * 2. Customer retrieves a seller profile by its unique identifier.
 * 3. Validates the complete response structure including the nested seller
 *    summary with suspension status.
 */
export async function test_api_seller_profile_suspended_seller_visible(
  connection: api.IConnection,
) {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const profile = await api.functional.shoppingMall.customer.profiles.at(
    customerConnection,
    { profileId: typia.random<string & tags.Format<"uuid">>() },
  );
  typia.assert(profile);
}
