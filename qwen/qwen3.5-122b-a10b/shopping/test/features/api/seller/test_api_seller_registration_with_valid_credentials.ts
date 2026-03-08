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

/**
 * Test seller registration with valid credentials.
 *
 * This test validates the primary success path for seller registration on the e-commerce mall platform.
 * A new seller provides valid registration credentials including a unique email address, password
 * meeting security requirements, and a unique shop name. The system should create a seller account
 * with approval_status set to 'pending' and account_status set to 'active'.
 *
 * Validation points:
 * - Response includes seller id, shop_name, approval_status, account_status
 * - approval_status is 'pending' (requires admin approval)
 * - account_status is 'active' (can login immediately)
 * - Authorization token contains access, refresh, expired_at, refreshable_until
 * - Token access and refresh are non-empty strings
 * - expired_at and refreshable_until are valid date-time strings
 */
export async function test_api_seller_registration_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection for registration
  const sellerConnection: api.IConnection = { host: connection.host };
  // Generate valid registration credentials
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  // Register seller using utility function
  const output: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    { body },
  );
  // Validate response structure with typia
  typia.assert(output);
  // Validate business logic: approval_status is pending
  TestValidator.predicate(
    "approval status is pending",
    output.approval_status === "pending",
  );
  // Validate business logic: account_status is active
  TestValidator.predicate(
    "account status is active",
    output.account_status === "active",
  );
  // Validate shop name matches input
  TestValidator.equals(
    "shop name matches input",
    output.shop_name,
    body.shop_name,
  );
  // Validate seller summary matches main response
  TestValidator.equals(
    "seller summary id matches",
    output.seller.id,
    output.id,
  );
  TestValidator.equals(
    "seller summary email matches",
    output.seller.email,
    body.email,
  );
  TestValidator.equals(
    "seller summary shop_name matches",
    output.seller.shop_name,
    output.shop_name,
  );
  TestValidator.predicate(
    "seller summary approval_status is pending",
    output.seller.approval_status === "pending",
  );
  TestValidator.predicate(
    "seller summary account_status is active",
    output.seller.account_status === "active",
  );
}
