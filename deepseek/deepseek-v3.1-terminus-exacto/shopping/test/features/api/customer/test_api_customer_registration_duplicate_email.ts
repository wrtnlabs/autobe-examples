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

export async function test_api_customer_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate random customer data for first registration
  const customerData = {
    email: typia.random<string & typia.tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 2,
      wordMax: 4,
    }).substring(0, 50),
    phone_number: RandomGenerator.mobile(),
  } satisfies IEcommerceCustomer.IJoin;
  // Register first customer successfully
  const firstConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(firstConnection, {
    body: customerData,
  });
  typia.assert(firstCustomer);
  // Attempt to register second customer with same email
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.ecommerce.auth.customer.join(secondConnection, {
        body: customerData satisfies IEcommerceCustomer.IJoin,
      });
    },
  );
}
