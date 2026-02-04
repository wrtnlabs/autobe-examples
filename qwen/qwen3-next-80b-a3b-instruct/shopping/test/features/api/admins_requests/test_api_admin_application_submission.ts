import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { prepare_random_shopping_mall_admin_password_reset } from "../../../prepare/prepare_random_shopping_mall_admin_password_reset";
import { generate_random_shopping_mall_customer_admins_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admins_requests_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_admin_application_submission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer to submit admin application
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData: IShoppingMallCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallCustomer.IJoin;
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, { body: customerData });
  typia.assert(authorizedCustomer);
  // Step 2: Create admin application with valid reason
  const adminReason: string = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<500>
  >();
  // Step 3: Submit admin application using authorized connection
  const adminRequest: IShoppingMallAdminPasswordReset =
    await api.functional.shoppingMall.customer.admins.requests.create(
      customerConnection,
      {
        body: {
          reason: adminReason,
        } satisfies IShoppingMallAdminPasswordReset.ICreate,
      },
    );
  // Step 4: Validate the response has all expected properties
  typia.assert(adminRequest);
}
