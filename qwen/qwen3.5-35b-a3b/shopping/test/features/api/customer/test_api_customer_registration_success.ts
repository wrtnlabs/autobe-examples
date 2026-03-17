import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration with valid credentials
  const customerConnection: api.IConnection = { host: connection.host };
  const registerResponse: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(registerResponse);
  // 2. Validate customer response structure
  const customerId: string = typia.assert<string & tags.Format<"uuid">>(
    registerResponse.id,
  );
  const customerEmail: string = typia.assert<string>(registerResponse.email);
  const displayName: string = typia.assert<
    string & tags.MinLength<1> & tags.MaxLength<100>
  >(registerResponse.display_name);
  const customerStatus: string = typia.assert<string>(registerResponse.status);
  const createdAt: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(registerResponse.created_at);
  const updatedAt: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(registerResponse.updated_at);
  const deletedAt: (string & tags.Format<"date-time">) | null =
    registerResponse.deleted_at;
  const phoneNumber: string | null = registerResponse.phone_number;
  const token: IAuthorizationToken = typia.assert<IAuthorizationToken>(
    registerResponse.token,
  );
  // 3. Validate token structure
  const access: string = typia.assert<string>(token.access);
  const refresh: string = typia.assert<string>(token.refresh);
  const expiredAt: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(token.expired_at);
  const refreshableUntil: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(token.refreshable_until);
  // 4. Validate customer status is active
  TestValidator.equals("customer status is active", customerStatus, "active");
  // 5. Validate deleted_at is null (account active)
  TestValidator.equals("deleted_at is null (account active)", deletedAt, null);
  // 6. Validate token fields exist and are non-empty
  TestValidator.notEquals("access token is non-empty", access, "");
  TestValidator.notEquals("refresh token is non-empty", refresh, "");
  TestValidator.notEquals("expired_at is non-empty", expiredAt, "");
  TestValidator.notEquals(
    "refreshable_until is non-empty",
    refreshableUntil,
    "",
  );
  // 7. Validate phone_number is null (not set during registration)
  TestValidator.equals(
    "phone_number is null (not set during registration)",
    phoneNumber,
    null,
  );
}
