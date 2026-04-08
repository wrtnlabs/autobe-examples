import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_administrator_customer_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      display_name: "Test Admin",
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  // 2. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "" satisfies (string & tags.Format<"uri">),
      referrer: "" satisfies (string & tags.Format<"uri">),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customerJoin);
  // 3. Retrieve customer profile as administrator
  const customerProfile =
    await api.functional.ecommerceMall.administrator.customers.at(
      adminConnection,
      {
        customerId: customerJoin.id,
      },
    );
  typia.assert(customerProfile);
  // 4. Validate response structure and data
  TestValidator.equals("customer id", customerProfile.id, customerJoin.id);
  TestValidator.equals(
    "email matches",
    customerProfile.email,
    customerJoin.email,
  );
  TestValidator.equals(
    "display_name matches",
    customerProfile.display_name,
    customerJoin.display_name,
  );
  TestValidator.equals(
    "phone_number matches",
    customerProfile.phone_number,
    customerJoin.phone_number,
  );
  TestValidator.notEquals(
    "created_at is valid",
    customerProfile.created_at,
    undefined,
  );
  TestValidator.notEquals(
    "updated_at is valid",
    customerProfile.updated_at,
    undefined,
  );
  // 5. Validate ISO 8601 timestamp format
  typia.assert(customerProfile.created_at);
  typia.assert(customerProfile.updated_at);
}