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

export async function test_api_seller_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for the seller
  const sellerConnection: api.IConnection = { host: connection.host };
  // Prepare registration data with unique email and valid password
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Execute seller registration
  const result = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Validate complete response structure
  typia.assert(result);
  // Verify new seller has pending approval status
  TestValidator.equals(
    "approval status is pending",
    result.approvalStatus,
    "pending",
  );
  // Verify shop profile fields are null for newly registered sellers
  TestValidator.equals(
    "shopName is null for new seller",
    result.shopName,
    null,
  );
  TestValidator.equals(
    "shopDescription is null for new seller",
    result.shopDescription,
    null,
  );
  TestValidator.equals(
    "logoImageUrl is null for new seller",
    result.logoImageUrl,
    null,
  );
  // Verify email matches the registration input
  TestValidator.equals("email matches registration input", result.email, email);
  // Verify JWT tokens are present in response
  TestValidator.predicate(
    "access token exists",
    () => result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => result.token.refresh.length > 0,
  );
  TestValidator.predicate("token has expiration", () =>
    typia.is<string & tags.Format<"date-time">>(result.token.expired_at),
  );
  TestValidator.predicate("token has refreshable_until", () =>
    typia.is<string & tags.Format<"date-time">>(result.token.refreshable_until),
  );
  // Verify connection is authorized with access token for subsequent requests
  TestValidator.equals(
    "connection authorization header set",
    sellerConnection.headers?.Authorization,
    result.token.access,
  );
}
