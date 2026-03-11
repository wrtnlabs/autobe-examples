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

export async function test_api_seller_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Prepare registration data with unique values
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name();
  const shopDescription = RandomGenerator.paragraph({ sentences: 3 });
  const logoImage = typia.random<string & tags.Format<"url">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Register seller using utility function
  const authorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email,
        password,
        shopName,
        shopDescription,
        logoImage,
        href,
        referrer,
        ip,
      },
    });
  // Validate complete response structure
  typia.assert(authorized);
  // Verify seller profile fields
  TestValidator.equals(
    "email normalized",
    authorized.email,
    email.toLowerCase(),
  );
  TestValidator.equals("shop name matches", authorized.shop_name, shopName);
  TestValidator.equals(
    "shop description matches",
    authorized.shop_description,
    shopDescription,
  );
  TestValidator.equals("logo image matches", authorized.logo_image, logoImage);
  // Verify account status fields - seller cannot sell until approved
  TestValidator.equals(
    "approval status is pending",
    authorized.approval_status,
    "pending",
  );
  TestValidator.equals(
    "rejection reason is null",
    authorized.rejection_reason,
    null,
  );
  TestValidator.equals("not suspended", authorized.suspended, false);
  TestValidator.equals("not banned", authorized.banned, false);
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  // Verify authorization token expiration dates are in the future
  TestValidator.predicate(
    "expired_at is future",
    new Date(authorized.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is future",
    new Date(authorized.token.refreshable_until) > new Date(),
  );
}
