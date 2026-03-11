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

export async function test_api_customer_view_own_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account via authorization utility
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>() satisfies string as string,
        password: typia.random<
          string & tags.Format<"password"> & tags.MinLength<8>
        >(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(authorized);
  // 2. Create new connection for profile retrieval with Authorization token
  const profileConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  // 3. Retrieve customer's own profile using their ID
  const profile: IEcommerceMallCustomer =
    await api.functional.ecommerceMall.customers.at(profileConnection, {
      customerId: authorized.id,
    });
  typia.assert(profile);
  // 4. Validate customer id matches the path parameter
  TestValidator.equals(
    "customer id matches authorized id",
    profile.id,
    authorized.id,
  );
  // 5. Validate email matches the registered email
  TestValidator.equals(
    "profile email matches authorized email",
    profile.email,
    authorized.email,
  );
  // 6. Validate ban status for newly created customer
  TestValidator.equals(
    "is_banned is false for new customer",
    profile.is_banned,
    false,
  );
  TestValidator.equals(
    "ban_reason is null for unbanned customer",
    profile.ban_reason,
    null,
  );
  // 7. Validate created_at timestamp is valid and recent
  const creationTime = new Date(profile.created_at).getTime();
  const currentTime = new Date().getTime();
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(creationTime),
  );
  TestValidator.predicate(
    "created_at is within reasonable time bounds (less than 1 hour ago)",
    () => currentTime - creationTime < 1000 * 60 * 60,
  );
  // 8. Validate updated_at timestamp is valid
  const updateTime = new Date(profile.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(updateTime),
  );
}