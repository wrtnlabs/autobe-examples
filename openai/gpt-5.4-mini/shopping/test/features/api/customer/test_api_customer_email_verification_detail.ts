import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_email_verification_detail(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const emailVerificationId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.shoppingMall.customer.email_verifications.at(
      customerConnection,
      { emailVerificationId },
    );
  typia.assert(output);
  TestValidator.equals(
    "verification owner id",
    output.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "verification owner email",
    output.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "verification owner account status",
    output.customer.accountStatus,
    authorized.accountStatus,
  );
  TestValidator.equals(
    "verification owner deletedAt",
    output.customer.deletedAt,
    authorized.deletedAt,
  );
  TestValidator.predicate(
    "verification token is present",
    output.token.length > 0,
  );
  TestValidator.predicate(
    "verification sentAt is present",
    output.sentAt.length > 0,
  );
  TestValidator.predicate(
    "verification expiredAt is present",
    output.expiredAt.length > 0,
  );
  TestValidator.predicate(
    "verification createdAt is present",
    output.createdAt.length > 0,
  );
  TestValidator.predicate(
    "verification updatedAt is present",
    output.updatedAt.length > 0,
  );
  TestValidator.equals(
    "verification record is active or deleted",
    output.deletedAt,
    output.deletedAt,
  );
}
