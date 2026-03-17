import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_join_immediate_authentication(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare unique customer registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const nickname = RandomGenerator.name();
  const phone_number = RandomGenerator.mobile();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // 2. Register customer using utility function (establishes authentication)
  const authorized: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(connection, {
      body: {
        email,
        password,
        nickname,
        phone_number,
        href,
        referrer,
        ip: null,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  // 3. Validate response structure and types
  typia.assert(authorized);
  // 4. Verify customer information matches registration data
  TestValidator.equals("email matches", authorized.email, email);
  TestValidator.equals("nickname matches", authorized.nickname, nickname);
  TestValidator.equals(
    "phone number matches",
    authorized.phone_number,
    phone_number,
  );
  // 5. Verify timestamps are valid date-time strings
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(authorized.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(authorized.updated_at).getTime()),
  );
  TestValidator.equals(
    "deleted_at is null for new account",
    authorized.deleted_at,
    null,
  );
  // 6. Verify customer summary is embedded and matches
  TestValidator.equals(
    "customer summary id matches",
    authorized.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer summary email matches",
    authorized.customer.email,
    email,
  );
  TestValidator.equals(
    "customer summary nickname matches",
    authorized.customer.nickname,
    nickname,
  );
  // 7. Verify authorization token structure
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(new Date(authorized.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(new Date(authorized.token.refreshable_until).getTime()),
  );
  // 8. Verify token expiration logic (refreshable_until >= expired_at)
  const expiredAt = new Date(authorized.token.expired_at).getTime();
  const refreshableUntil = new Date(
    authorized.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    refreshableUntil >= expiredAt,
  );
}
