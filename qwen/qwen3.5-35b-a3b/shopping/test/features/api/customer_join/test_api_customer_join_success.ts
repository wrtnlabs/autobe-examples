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

export async function test_api_customer_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection for customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Generate valid registration data
  const joinInput = {
    email: typia.random<
      string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
    >() satisfies string as string &
      tags.Format<"email"> &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    password: RandomGenerator.alphaNumeric(12) satisfies string &
      tags.Format<"password"> &
      tags.MinLength<8>,
    href: typia.random<
      string & tags.Format<"uri">
    >() satisfies string as string & tags.Format<"uri">,
    referrer: typia.random<
      string & tags.Format<"uri">
    >() satisfies string as string & tags.Format<"uri">,
    ip: typia.random<
      string & tags.Format<"ipv4">
    >() satisfies string as string & tags.Format<"ipv4">,
  } satisfies IEcommerceMallCustomer.IJoin;
  // 3. Register customer using utility function
  const result = await authorize_customer_join(customerConnection, {
    body: joinInput,
  });
  typia.assert(result);
  // 4. Validate customer account creation
  TestValidator.equals("email matches input", result.email, joinInput.email);
  TestValidator.equals("is_banned is false", result.is_banned, false);
  TestValidator.equals("ban_reason is null", result.ban_reason, null);
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(result.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(result.updated_at)),
  );
  // 5. Validate authorization token
  TestValidator.equals(
    "access token exists",
    result.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    result.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    () => !isNaN(Date.parse(result.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    () => !isNaN(Date.parse(result.token.refreshable_until)),
  );
  TestValidator.predicate(
    "access token expired after registration",
    () => new Date(result.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until extends beyond access expiration",
    () =>
      new Date(result.token.refreshable_until) >=
      new Date(result.token.expired_at),
  );
  // 6. Validate customer ID format
  TestValidator.predicate("customer ID is valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
  );
}
