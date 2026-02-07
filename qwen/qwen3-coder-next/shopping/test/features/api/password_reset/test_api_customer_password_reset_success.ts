import api from "@ORGANIZATION/PROJECT-api";
import type { IAutoBeSuccess } from "@ORGANIZATION/PROJECT-api/lib/structures/IAutoBeSuccess";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_shopping_mall_customer_password_resets_create } from "../../../generate/generate_random_shopping_mall_customer_password_resets_create";
import { prepare_random_shopping_mall_customer_password_reset } from "../../../prepare/prepare_random_shopping_mall_customer_password_reset";

export async function test_api_customer_password_reset_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connections
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Prepare a valid customer email address
  const email = typia.random<string & tags.Format<"email">>();
  // 3. Send POST request to /shoppingMall/customer/password-resets with the email
  const result =
    await generate_random_shopping_mall_customer_password_resets_create(
      customerConnection,
      {
        body: { email } satisfies IShoppingMallCustomerPasswordReset.ICreate,
      },
    );
  typia.assert(result);
  // 4. Verify successful response - response type is empty, so just validate structure
  TestValidator.predicate(
    "response structure is valid IAutoBeSuccess.IResponse",
    () => typeof result === "object" && result !== null,
  );
}
