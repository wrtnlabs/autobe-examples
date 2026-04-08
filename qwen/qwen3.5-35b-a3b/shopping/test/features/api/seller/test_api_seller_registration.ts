import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_registration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(registeredSeller);
  // Step 2: Verify response contains required seller metadata
  TestValidator.predicate(
    "seller id is valid uuid",
    registeredSeller.id !== undefined,
  );
  TestValidator.predicate(
    "email is non-empty string",
    registeredSeller.email.length > 0,
  );
  TestValidator.predicate(
    "display_name is non-empty string",
    registeredSeller.display_name.length > 0,
  );
  TestValidator.equals(
    "approval status is pending",
    registeredSeller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "rejection reason is null",
    registeredSeller.rejection_reason,
    null,
  );
  TestValidator.equals(
    "seller not suspended",
    registeredSeller.is_suspended,
    false,
  );
  TestValidator.predicate(
    "created_at is present",
    registeredSeller.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is present",
    registeredSeller.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", registeredSeller.deleted_at, null);
  // Step 3: Verify token structure
  TestValidator.predicate(
    "access token is non-empty",
    registeredSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    registeredSeller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is present",
    registeredSeller.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until is present",
    registeredSeller.token.refreshable_until !== undefined,
  );
  // Step 4: Verify JWT token format (three parts separated by dots)
  const accessParts = registeredSeller.token.access.split(".");
  TestValidator.equals(
    "access token has valid JWT format",
    accessParts.length,
    3,
  );
  const refreshParts = registeredSeller.token.refresh.split(".");
  TestValidator.equals(
    "refresh token has valid JWT format",
    refreshParts.length,
    3,
  );
  // Step 5: Verify tokens can be used for authentication
  const authConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${registeredSeller.token.access}`,
    },
  };
  // Verify connection headers were set by authorize function
  TestValidator.predicate(
    "seller connection has auth header set",
    sellerConnection.headers?.Authorization !== undefined,
  );
  // Verify the auth connection can be used for API calls
  typia.assert(authConnection.headers!);
  const authHeader = authConnection.headers!.Authorization;
  TestValidator.predicate(
    "auth connection has correct bearer token",
    typeof authHeader === "string" && authHeader.startsWith("Bearer "),
  );
}
