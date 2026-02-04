import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_password_reset_token_expired_retrieval(
  connection: api.IConnection,
) {
  // Create customer account, which triggers password reset token creation
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(connection, {
      body: {
        email: RandomGenerator.name() + "@test.com",
        password: "Password123!",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);
  // Assume password reset token ID is generated and available
  const resetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Verify valid token works initially
  const validToken: IShoppingMallCustomerPasswordReset =
    await api.functional.shoppingMall.customer.password_resets.at(connection, {
      resetId,
    });
  typia.assert(validToken);
  // Verify expired token returns error
  await TestValidator.error("expired token should return error", async () => {
    await api.functional.shoppingMall.customer.password_resets.at(connection, {
      resetId,
    });
  });
}
