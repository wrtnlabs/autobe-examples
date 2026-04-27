import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection for registration
  const customerConnection: api.IConnection = { host: connection.host };
  // Prepare registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Register customer using utility function
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip: null,
    },
  });
  // Validate response structure
  typia.assert(authorized);
  // Business logic validations
  TestValidator.equals("email matches input", authorized.email, email);
  TestValidator.equals("banned_at is null", authorized.banned_at, null);
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  // Validate profile defaults
  TestValidator.equals(
    "display_name is empty",
    authorized.profile.display_name,
    "",
  );
  TestValidator.equals(
    "phone_number is null",
    authorized.profile.phone_number,
    null,
  );
  TestValidator.equals(
    "profile deleted_at is null",
    authorized.profile.deleted_at,
    null,
  );
  // Validate token structure
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(authorized.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(authorized.token.refreshable_until).getTime() >
      new Date(authorized.token.expired_at).getTime(),
  );
  // Verify the customer can log in with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip: null,
    },
  });
  typia.assert(loginResult);
  TestValidator.equals("login email matches", loginResult.email, email);
}
