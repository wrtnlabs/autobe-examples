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

export async function test_api_seller_login_approved_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Step 1: Generate test data with approved seller status
   * In a real E2E scenario, we would:
   * 1. Register seller with pending status
   * 2. Use admin API to approve the seller
   * Since admin APIs are not available in this test suite, we generate
   * approved seller data directly for testing login functionality
   */
  const approvedSellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    approval_status: "approved" as const,
    rejection_reason: null,
    is_suspended: false,
  } satisfies IEcommerceMallSeller.IJoin & {
    approval_status: "approved" | "pending" | "rejected";
    rejection_reason: string | null;
    is_suspended: boolean;
  };
  /**
   * Step 2: Create seller account (simulated with approved status)
   * In production, this would be a real join followed by admin approval
   */
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(joinConnection, {
    body: {
      email: approvedSellerData.email,
      password: approvedSellerData.password,
      display_name: approvedSellerData.display_name,
      href: approvedSellerData.href,
      referrer: approvedSellerData.referrer,
      ip: approvedSellerData.ip,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  /**
   * Step 3: Login with seller credentials
   */
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: approvedSellerData.email,
    password: approvedSellerData.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSeller.ILogin;
  const loginResult = await authorize_seller_login(loginConnection, {
    body: loginInput,
  });
  typia.assert(loginResult);
  /**
   * Step 4: Verify IAuthorized response structure
   */
  TestValidator.equals(
    "seller email",
    loginResult.email,
    approvedSellerData.email,
  );
  TestValidator.equals(
    "display name",
    loginResult.display_name,
    approvedSellerData.display_name,
  );
  /**
   * Step 5: Verify approval status is 'approved'
   */
  TestValidator.equals(
    "approval status",
    loginResult.approval_status,
    "approved",
  );
  /**
   * Step 6: Verify rejection_reason is null for approved seller
   */
  TestValidator.equals("rejection reason", loginResult.rejection_reason, null);
  /**
   * Step 7: Verify seller is not suspended
   */
  TestValidator.equals("is suspended", loginResult.is_suspended, false);
  /**
   * Step 8: Verify token structure
   */
  TestValidator.predicate(
    "token has access",
    () => loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has refresh",
    () => loginResult.token.refresh.length > 0,
  );
  /**
   * Step 9: Verify token expiration times are in the future
   */
  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate("expired_at is in future", () => expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in future",
    () => refreshableUntil > now,
  );
  /**
   * Step 10: Verify refreshable_until is after expired_at
   */
  TestValidator.predicate(
    "refreshable_until after expired_at",
    () => refreshableUntil > expiredAt,
  );
}