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

export async function test_api_seller_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create unique seller credentials
  const uniqueEmail = `${RandomGenerator.alphaNumeric(8)}@test-seller-${RandomGenerator.alphaNumeric(4)}.com`;
  const strongPassword = `${RandomGenerator.name()!.toUpperCase()}${RandomGenerator.alphaNumeric(6)}!@#`;
  // Prepare registration request body
  const joinInput = {
    email: uniqueEmail satisfies string & tags.Format<"email">,
    password: strongPassword satisfies string & tags.Format<"password">,
    href: typia.random<string>() satisfies string & tags.Format<"uri">,
    referrer: typia.random<string>() satisfies string & tags.Format<"uri">,
    ip: typia.random<string>() satisfies string & tags.Format<"ipv4">,
  } satisfies IEcommerceMallSeller.IJoin;
  // Perform seller registration using utility function
  const authorized = await authorize_seller_join(connection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // Validate seller identity
  typia.assertGuard(authorized.id);
  TestValidator.equals(
    "email matches registration input",
    authorized.email,
    joinInput.email,
  );
  TestValidator.equals(
    "approval status is pending",
    authorized.approval_status,
    "pending",
  );
  TestValidator.equals(
    "seller is not suspended",
    authorized.is_suspended,
    false,
  );
  TestValidator.equals("seller is not banned", authorized.is_banned, false);
  // Validate timestamps are in ISO 8601 format using typia
  typia.assertGuard(authorized.created_at);
  typia.assertGuard(authorized.updated_at);
  // Validate token structure
  typia.assertGuard(authorized.token);
  typia.assertGuard(authorized.token.access);
  typia.assertGuard(authorized.token.refresh);
  typia.assertGuard(authorized.token.expired_at);
  typia.assertGuard(authorized.token.refreshable_until);
  // Validate expiration timestamps are in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "expired_at is in the future",
    authorized.token.expired_at > now,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    authorized.token.refreshable_until > now,
  );
}