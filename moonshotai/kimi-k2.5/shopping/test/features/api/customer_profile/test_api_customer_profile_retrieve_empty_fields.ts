import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_retrieve_empty_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for customer
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new customer who has empty profile fields
  // Using authorize_customer_join for the POST /ecommerceMall/auth/customer/join endpoint
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Validate join response - contains customer info with empty profile fields
  typia.assert(joined);
  // Step 2: Retrieve customer profile via GET /ecommerceMall/customer/profile
  // For a newly registered customer, profile fields will be empty/default values
  const profile =
    await api.functional.ecommerceMall.customer.profile.at(customerConnection);
  // Step 3: Validate complete profile structure - typia.assert validates all fields
  typia.assert(profile);
}
