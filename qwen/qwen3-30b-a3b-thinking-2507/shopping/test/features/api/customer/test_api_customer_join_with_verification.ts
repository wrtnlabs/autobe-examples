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

export async function test_api_customer_join_with_verification(
  connection: api.IConnection,
) {
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate valid email
  const email = typia.random<string & tags.Format<"email">>();
  // Generate valid password (minimum 8 characters with uppercase, number, and special character)
  const basePassword = RandomGenerator.alphaNumeric(14);
  const specialChar = RandomGenerator.pick(["!", "@", "#", "$", "%"]);
  const uppercaseChar = RandomGenerator.alphaNumeric(1).toUpperCase();
  const password = specialChar + basePassword + uppercaseChar;
  // Create registration body
  const body = {
    email,
    password,
    href: RandomGenerator.paragraph({ sentences: 1 }),
    referrer: RandomGenerator.paragraph({ sentences: 1 }),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceCustomer.IJoin;
  // Perform registration using utility function (not SDK directly)
  const customer = await authorize_customer_join(customerConnection, {
    body,
  });
  typia.assert(customer);
  // Validate key assertions
  TestValidator.equals("email matches input", customer.email, email);
  TestValidator.equals("email_verified state", customer.email_verified, false);
}
