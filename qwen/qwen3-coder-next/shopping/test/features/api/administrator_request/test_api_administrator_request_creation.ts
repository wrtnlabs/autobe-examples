import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { generate_random_shopping_mall_admin_administrators_request_administrator } from "../../../generate/generate_random_shopping_mall_admin_administrators_request_administrator";
import { prepare_random_shopping_mall_admin } from "../../../prepare/prepare_random_shopping_mall_admin";

export async function test_api_administrator_request_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin actor for testing
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12341234" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create customer actor for submission
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
      password: "12341234" satisfies string & tags.Format<"password">,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://google.com" satisfies string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Submit administrator request
  const requestReason = RandomGenerator.paragraph({ sentences: 3 });
  const administratorRequest =
    await api.functional.shoppingMall.admin.administrators.requestAdministrator(
      customerConnection,
      {
        body: {
          reason: requestReason,
        } satisfies IShoppingMallAdmin.ICreate,
      },
    );
  typia.assert(administratorRequest);
  // 4. Validate response structure matches customer
  TestValidator.equals(
    "requester email matches customer",
    administratorRequest.requester.email,
    customer.customer.email,
  );
  TestValidator.equals(
    "requester display name matches customer",
    administratorRequest.requester.display_name,
    customer.customer.display_name,
  );
}