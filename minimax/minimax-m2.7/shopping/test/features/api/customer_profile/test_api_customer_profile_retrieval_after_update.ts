import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_retrieval_after_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {});
  // 2. Retrieve the customer profile
  const profile: IEcommerceMallCustomerProfile =
    await api.functional.ecommerceMall.customer.profile.at(customerConnection);
  // 3. Validate the response
  typia.assert(profile);
  // 4. Verify profile structure
  TestValidator.equals(
    "profile type is customer",
    profile.profileType,
    "customer",
  );
  TestValidator.predicate("profile has valid id", !!profile.id);
  TestValidator.predicate("customerId exists", !!profile.customerId);
  TestValidator.predicate(
    "createdAt is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.createdAt),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.updatedAt),
  );
}
