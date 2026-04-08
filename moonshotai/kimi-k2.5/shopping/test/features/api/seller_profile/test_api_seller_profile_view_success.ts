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

export async function test_api_seller_profile_view_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer-specific connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = typia.random<IEcommerceMallCustomer.IJoin>();
  await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  // Step 2: Generate valid seller ID
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve seller public profile
  const profile =
    await api.functional.ecommerceMall.customer.sellers.profile.at(
      customerConnection,
      { sellerId },
    );
  // Step 4: Validate response structure
  typia.assert(profile);
}
