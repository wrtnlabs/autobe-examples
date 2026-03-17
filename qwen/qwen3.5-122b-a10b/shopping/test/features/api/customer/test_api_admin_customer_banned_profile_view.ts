import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_admin_customer_banned_profile_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Customer joins the system
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
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
  typia.assert(customerAuth);
  // 3. Administrator bans the customer
  const bannedCustomer = await api.functional.ecommerceMall.admin.customers.ban(
    adminConnection,
    {
      customerId: customerAuth.id,
    },
  );
  typia.assert(bannedCustomer);
  // 4. Administrator views the banned customer profile
  const viewedProfile = await api.functional.ecommerceMall.admin.customers.at(
    adminConnection,
    {
      customerId: customerAuth.id,
    },
  );
  typia.assert(viewedProfile);
  // 5. Validate the banned customer profile
  TestValidator.equals(
    "account status is banned",
    viewedProfile.account_status,
    "banned",
  );
  TestValidator.equals(
    "email preserved",
    viewedProfile.email,
    customerAuth.email,
  );
  TestValidator.equals(
    "display name preserved",
    viewedProfile.display_name,
    customerAuth.display_name,
  );
  TestValidator.equals(
    "phone number preserved",
    viewedProfile.phone_number,
    customerAuth.phone_number,
  );
  TestValidator.equals(
    "created at preserved",
    viewedProfile.created_at,
    customerAuth.created_at,
  );
  TestValidator.predicate(
    "updated at exists",
    viewedProfile.updated_at !== null,
  );
  TestValidator.equals("deleted at is null", viewedProfile.deleted_at, null);
}