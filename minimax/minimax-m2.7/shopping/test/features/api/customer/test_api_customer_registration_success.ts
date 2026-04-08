import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
  // 1. Generate unique registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // 2. Register customer using utility function (sets Authorization header)
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    },
  });
  // 3. Validate response structure with typia.assert
  typia.assert(authorized);
  // 4. Validate customer ID is valid UUID
  TestValidator.equals("id is uuid format", authorized.id.length, 36);
  TestValidator.predicate(
    "id is valid uuid pattern",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // 5. Validate email matches input
  TestValidator.equals("email matches input", authorized.email, email);
  // 6. Validate timestamps exist and are valid date-time format
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(authorized.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(authorized.updated_at)),
  );
  // 7. Validate deleted_at is null for active account
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  // 8. Validate profile structure
  TestValidator.equals(
    "profile id is uuid format",
    authorized.profile.id.length,
    36,
  );
  TestValidator.equals(
    "profile displayName is empty",
    authorized.profile.displayName,
    "",
  );
  TestValidator.equals("profile phone is empty", authorized.profile.phone, "");
  TestValidator.predicate(
    "profile createdAt is valid date-time",
    !isNaN(Date.parse(authorized.profile.createdAt)),
  );
  TestValidator.predicate(
    "profile updatedAt is valid date-time",
    !isNaN(Date.parse(authorized.profile.updatedAt)),
  );
  // 9. Validate token structure
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  // 10. Validate addresses array is empty for new customer
  TestValidator.equals(
    "addresses array is empty",
    authorized.addresses.length,
    0,
  );
  // 11. Verify customerConnection has Authorization header set from token
  const authHeader = customerConnection.headers?.Authorization;
  TestValidator.predicate(
    "Authorization header is set",
    typeof authHeader === "string" && authHeader.includes("Bearer "),
  );
}