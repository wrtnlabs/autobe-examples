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

/**
 * Test customer profile view with complete information.
 * 1. Customer registers with valid credentials
 * 2. Customer views their profile
 * 3. Validate all profile fields are present and correct
 * 4. Verify account_status is 'active' for newly registered customer
 * 5. Verify all timestamps are valid date-time format
 */
export async function test_api_customer_profile_view_with_complete_information(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registers
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Customer views their profile (customerConnection already has auth token)
  const profile =
    await api.functional.ecommerceMall.customer.profile.at(customerConnection);
  typia.assert(profile);
  // 3. Validate all profile fields
  TestValidator.equals("email matches", profile.email, authorized.email);
  TestValidator.equals(
    "display_name matches",
    profile.display_name,
    authorized.display_name,
  );
  TestValidator.equals(
    "phone_number matches",
    profile.phone_number,
    authorized.phone_number,
  );
  TestValidator.predicate(
    "account_status is active",
    profile.account_status === "active",
  );
  TestValidator.equals("id is valid UUID", profile.id, authorized.id);
  // 4. Verify timestamps are valid date-time format
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      profile.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      profile.updated_at,
    ),
  );
  TestValidator.predicate(
    "deleted_at is null for active account",
    profile.deleted_at === null,
  );
  // 5. Verify created_at <= updated_at for newly registered customer
  TestValidator.predicate(
    "created_at <= updated_at",
    Date.parse(profile.created_at) <= Date.parse(profile.updated_at),
  );
}
