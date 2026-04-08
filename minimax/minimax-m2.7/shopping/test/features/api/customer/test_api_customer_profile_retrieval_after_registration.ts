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

export async function test_api_customer_profile_retrieval_after_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  // 2. Retrieve the customer profile
  const profile =
    await api.functional.ecommerceMall.customer.profile.at(customerConnection);
  typia.assert(profile);
  // 3. Validate profile response
  TestValidator.equals(
    "profile type is customer",
    profile.profileType,
    "customer",
  );
  TestValidator.equals(
    "customer ID matches authorized customer",
    profile.customerId,
    authorized.id,
  );
  TestValidator.equals("display name is empty string", profile.displayName, "");
  TestValidator.equals("phone is null", profile.phone, null);
  TestValidator.predicate(
    "createdAt is valid date-time",
    !isNaN(Date.parse(profile.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    !isNaN(Date.parse(profile.updatedAt)),
  );
}
