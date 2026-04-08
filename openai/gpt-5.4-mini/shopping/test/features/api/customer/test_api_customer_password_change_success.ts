import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_change_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(8)}@test.com`;
  const password = RandomGenerator.alphaNumeric(12);
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const output = await api.functional.mallPlatform.customer.passwords.update(
    customerConnection,
    {
      body: {
        currentPassword: password,
        newPassword: `${RandomGenerator.alphaNumeric(6)}A1!`,
      } satisfies IMallPlatformCustomerPasswordReset.IUpdate,
    },
  );
  typia.assert(output);
  TestValidator.equals("password reset email preserved", output.email, email);
  TestValidator.equals(
    "password reset id is preserved as a record identifier",
    output.id.length > 0,
    true,
  );
  TestValidator.predicate(
    "password reset updatedAt is a timestamp",
    () => output.updatedAt.length > 0,
  );
}
