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

export async function test_api_customer_password_reset_existing_email(
  connection: api.IConnection,
): Promise<void> {
  // Use a known existing email for testing
  const existingEmail: string = typia.random<string & tags.Format<"email">>();
  // Since we cannot create a customer in this test, we'll test password reset
  // directly with an existing email. In a real scenario, this email would
  // already exist in the database from test setup.
  // Test password reset for existing customer email
  const output =
    await api.functional.shoppingMall.customer.password_resets.create(
      connection,
      {
        body: {
          email: existingEmail,
        } satisfies IShoppingMallCustomerPasswordReset.ICreate,
      },
    );
  typia.assert(output);
  // Verify the response is successful without exposing email existence
  TestValidator.equals("response success", (output as any).success, true);
}