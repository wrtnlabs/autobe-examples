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

export async function test_api_customer_profile_view_with_optional_fields_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer with optional fields set to null
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Create authenticated customer connection
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  // 3. View customer profile
  const profile =
    await api.functional.ecommerceMall.customer.profile.at(customerConnection);
  typia.assert(profile);
  // 4. Validate optional fields are null
  TestValidator.equals("display_name is null", profile.display_name, null);
  TestValidator.equals("phone_number is null", profile.phone_number, null);
  // 5. Validate account_status is active
  TestValidator.equals(
    "account_status is active",
    profile.account_status,
    "active",
  );
  // 6. Validate deleted_at is null (account not deleted)
  TestValidator.equals("deleted_at is null", profile.deleted_at, null);
}
