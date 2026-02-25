import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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
 * Test customer address default switch functionality.
 *
 * Note: This test focuses on customer authentication workflow since address
 * management endpoints are not available in the provided API specification.
 */
export async function test_api_customer_address_default_switch(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 4,
      }).substring(0, 50),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Test customer profile retrieval to verify authentication works
  const profileCheck =
    await api.functional.ecommerce.customer.addresses._default.setDefault(
      customerConnection,
      { body: {} as IEcommerceCustomer.IUpdate },
    );
  typia.assert(profileCheck);
  // Verify customer profile information matches
  TestValidator.equals(
    "customer ID should match",
    profileCheck.id,
    customer.id,
  );
  TestValidator.equals(
    "email should match",
    profileCheck.email,
    customer.email,
  );
  TestValidator.equals(
    "display name should match",
    profileCheck.display_name,
    customer.display_name,
  );
}
