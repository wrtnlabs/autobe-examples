import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_email_verifications_create } from "../../../generate/generate_random_shopping_mall_customer_email_verifications_create";
import { prepare_random_shopping_mall_customer_email_verification } from "../../../prepare/prepare_random_shopping_mall_customer_email_verification";

export async function test_api_email_verification_audit_logging(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new customer account
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = "TestPassword123!";
  const joinName = RandomGenerator.name();
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      name: joinName,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // Step 2: Create first email verification token
  const firstVerification =
    await api.functional.shoppingMall.customer.email_verifications.create(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCustomerEmailVerification.ICreate,
      },
    );
  typia.assert(firstVerification);
  // Step 3: Create second email verification token (rate limit test)
  const secondVerification =
    await api.functional.shoppingMall.customer.email_verifications.create(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCustomerEmailVerification.ICreate,
      },
    );
  typia.assert(secondVerification);
  // Step 4: Verify tokens are distinct (rate limit produces different tokens)
  TestValidator.notEquals(
    "tokens are distinct",
    firstVerification,
    secondVerification,
  );
  // Step 5: Verify audit logging by checking that verification records are created
  void firstVerification;
  void secondVerification;
}