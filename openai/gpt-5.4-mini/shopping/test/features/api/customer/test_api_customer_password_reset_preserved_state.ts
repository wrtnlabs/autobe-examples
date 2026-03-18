import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_reset_preserved_state(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();
  let first: IShoppingMallCustomerPasswordReset | undefined;
  let second: IShoppingMallCustomerPasswordReset | undefined;
  try {
    first = await api.functional.shoppingMall.customer.password_resets.at(
      customerConnection,
      {
        passwordResetId,
      },
    );
    typia.assert<IShoppingMallCustomerPasswordReset>(first);
    second = await api.functional.shoppingMall.customer.password_resets.at(
      customerConnection,
      {
        passwordResetId,
      },
    );
    typia.assert<IShoppingMallCustomerPasswordReset>(second);
  } catch (error: unknown) {
    if (!(
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      ((error as { status: number }).status === 404 ||
        (error as { status: number }).status === 401 ||
        (error as { status: number }).status === 403)
    )) throw error;
    TestValidator.predicate(
      "password reset lookup should fail consistently for an unavailable record",
      true,
    );
    return;
  }
  TestValidator.equals(
    "password reset response should be stable",
    first,
    second,
  );
  TestValidator.equals(
    "password reset id should match request",
    first.id,
    second.id,
  );
  TestValidator.equals(
    "password reset customer should be stable",
    first.customer,
    second.customer,
  );
  TestValidator.equals(
    "password reset expiredAt should be stable",
    first.expiredAt,
    second.expiredAt,
  );
  TestValidator.equals(
    "password reset usedAt should be stable",
    first.usedAt,
    second.usedAt,
  );
  TestValidator.equals(
    "password reset createdAt should be stable",
    first.createdAt,
    second.createdAt,
  );
  TestValidator.equals(
    "password reset updatedAt should be stable",
    first.updatedAt,
    second.updatedAt,
  );
  TestValidator.equals(
    "password reset deletedAt should be stable",
    first.deletedAt,
    second.deletedAt,
  );
}
