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

export async function test_api_customer_registration_response_structure(
  connection: api.IConnection,
): Promise<void> {
  // Register a new customer with valid credentials
  const customerConnection: api.IConnection = { host: connection.host };
  const output = await authorize_customer_join(customerConnection, {});
  // Validate complete response structure with typia.assert
  typia.assert(output);
  // Validate JWT tokens exist and have valid structure
  TestValidator.equals("token exists", !!output.token, true);
  TestValidator.equals(
    "access token is string",
    typeof output.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token is string",
    typeof output.token.refresh,
    "string",
  );
  TestValidator.equals(
    "expired_at is string",
    typeof output.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "refreshable_until is string",
    typeof output.token.refreshable_until,
    "string",
  );
  // Validate token expiration timestamps are valid ISO 8601 format
  const expiredAtDate = new Date(output.token.expired_at);
  TestValidator.predicate(
    "expired_at is valid ISO 8601",
    !isNaN(expiredAtDate.getTime()),
  );
  const refreshableUntilDate = new Date(output.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601",
    !isNaN(refreshableUntilDate.getTime()),
  );
  // Validate expiration is in the future (within acceptable range: next 15-60 minutes for access token)
  const now = new Date();
  TestValidator.predicate("access token not expired", expiredAtDate > now);
  // Validate refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until after expired_at",
    refreshableUntilDate > expiredAtDate,
  );
  // Validate profile object exists with empty displayName and phone
  TestValidator.equals("profile exists", !!output.profile, true);
  TestValidator.equals(
    "profile id matches customer id",
    output.profile.id,
    output.id,
  );
  TestValidator.equals(
    "displayName is empty string",
    output.profile.displayName,
    "",
  );
  TestValidator.equals("phone is empty string", output.profile.phone, "");
  // Validate profile timestamps are valid ISO 8601
  const profileCreatedAt = new Date(output.profile.createdAt);
  TestValidator.predicate(
    "profile createdAt is valid ISO 8601",
    !isNaN(profileCreatedAt.getTime()),
  );
  const profileUpdatedAt = new Date(output.profile.updatedAt);
  TestValidator.predicate(
    "profile updatedAt is valid ISO 8601",
    !isNaN(profileUpdatedAt.getTime()),
  );
  // Validate customer IDs match
  TestValidator.equals("customer id exists", !!output.id, true);
  TestValidator.equals("email exists", !!output.email, true);
  TestValidator.equals("created_at exists", !!output.created_at, true);
  TestValidator.equals("updated_at exists", !!output.updated_at, true);
  // Validate main created_at and updated_at are valid ISO 8601 format
  const customerCreatedAt = new Date(output.created_at);
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    !isNaN(customerCreatedAt.getTime()),
  );
  const customerUpdatedAt = new Date(output.updated_at);
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    !isNaN(customerUpdatedAt.getTime()),
  );
  // Validate timestamps are within acceptable range (not too old, not in future)
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  TestValidator.predicate(
    "created_at within acceptable range",
    customerCreatedAt >= fiveMinutesAgo &&
      customerCreatedAt <= fiveMinutesFromNow,
  );
  TestValidator.predicate(
    "updated_at within acceptable range",
    customerUpdatedAt >= fiveMinutesAgo &&
      customerUpdatedAt <= fiveMinutesFromNow,
  );
  // Validate deleted_at is null (active account)
  TestValidator.equals("deleted_at is null", output.deleted_at, null);
  // Validate addresses array exists and is empty
  TestValidator.equals(
    "addresses is array",
    Array.isArray(output.addresses),
    true,
  );
  TestValidator.equals("addresses is empty", output.addresses.length, 0);
}
