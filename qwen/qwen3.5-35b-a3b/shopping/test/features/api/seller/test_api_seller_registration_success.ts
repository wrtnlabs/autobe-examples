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
  // 1. Create seller-specific connection for isolation
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register seller account using utility function (priority over SDK)
  const output = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Validate response structure with typia.assert()
  typia.assert(output);
  // 4. Verify seller account state
  TestValidator.equals(
    "approval status pending",
    output.approval_status,
    "pending",
  );
  TestValidator.predicate("is not suspended", output.is_suspended === false);
  TestValidator.predicate("is not banned", output.is_banned === false);
  // 5. Verify token validity (access and refresh tokens exist and are valid)
  typia.assert(output.token);
  const now = new Date();
  const accessTokenExpired = new Date(output.token.expired_at);
  const refreshableUntil = new Date(output.token.refreshable_until);
  // Access token should not be expired
  TestValidator.predicate(
    "access token not expired",
    accessTokenExpired.getTime() > now.getTime(),
  );
  // Refresh token should be valid for approximately 7 days
  TestValidator.predicate(
    "refresh token valid for 7 days",
    Math.abs(refreshableUntil.getTime() - now.getTime()) <=
      7 * 24 * 60 * 60 * 1000,
  );
  // 6. Verify createdAt timestamp exists (validated by typia.assert format)
  TestValidator.predicate(
    "createdAt timestamp recorded",
    output.created_at !== undefined,
  );
  // 7. Verify updatedAt timestamp exists (validated by typia.assert format)
  TestValidator.predicate(
    "updatedAt timestamp recorded",
    output.updated_at !== undefined,
  );
  // 8. Verify deleted_at is null for active account
  TestValidator.equals(
    "deleted at null for active account",
    output.deleted_at,
    null,
  );
  // 9. Verify rejection reason is null (not rejected)
  TestValidator.equals("rejection reason null", output.rejection_reason, null);
}
