import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
  // Prepare registration data with all fields including optional ones
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name();
  const shopDescription = RandomGenerator.paragraph({ sentences: 5 });
  const logoImage = typia.random<string & tags.Format<"uri">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Call authorize_seller_join utility function for registration
  const response = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      shop_name: shopName,
      shop_description: shopDescription,
      logo_image: logoImage,
      href,
      referrer,
    },
  });
  // Validate complete response structure
  typia.assert(response);
  // Validate email matches (case-insensitive)
  TestValidator.equals(
    "email matches",
    response.email.toLowerCase(),
    email.toLowerCase(),
  );
  // Validate shop profile fields
  TestValidator.equals("shop name matches", response.shopName, shopName);
  TestValidator.equals(
    "shop description matches",
    response.shopDescription,
    shopDescription,
  );
  // logoImage format differs between request (uri) and response (url), compare as strings
  TestValidator.equals(
    "logo image matches",
    response.logoImage,
    logoImage satisfies string & tags.Format<"uri"> as string,
  );
  // Validate approval status for new seller
  TestValidator.equals(
    "approval status is pending",
    response.approval_status,
    "pending",
  );
  // Validate rejection reason is null for new accounts
  TestValidator.equals(
    "rejection reason is null",
    response.rejection_reason,
    null,
  );
  // Validate default account status flags
  TestValidator.equals("not suspended", response.suspended, false);
  TestValidator.equals("not banned", response.banned, false);
  // Validate token structure and expiration
  TestValidator.predicate(
    "access token exists",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is in future",
    new Date(response.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    new Date(response.token.refreshable_until).getTime() > Date.now(),
  );
  // Validate timestamps are recent
  const now = Date.now();
  const createdTime = new Date(response.created_at).getTime();
  const updatedTime = new Date(response.updated_at).getTime();
  TestValidator.predicate("created_at is recent", now - createdTime < 60000);
  TestValidator.predicate("updated_at is recent", now - updatedTime < 60000);
}
