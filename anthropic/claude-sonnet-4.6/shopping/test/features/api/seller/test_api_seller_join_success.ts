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
  // Create a seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Prepare unique registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const shop_name = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Call the utility function (MANDATORY for this endpoint)
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      shop_name,
      href,
      referrer,
    },
  });
  // Validate the response type
  typia.assert(authorized);
  // Validate business logic: email matches submitted email
  TestValidator.equals(
    "email matches submitted value",
    authorized.email,
    email,
  );
  // Validate business logic: shopName matches submitted shop_name
  TestValidator.equals(
    "shopName matches submitted shop_name",
    authorized.shopName,
    shop_name,
  );
  // Validate business logic: isBanned is false
  TestValidator.equals("isBanned is false", authorized.isBanned, false);
  // Validate business logic: isSuspended is false
  TestValidator.equals("isSuspended is false", authorized.isSuspended, false);
  // Validate business logic: deletedAt is null
  TestValidator.equals("deletedAt is null", authorized.deletedAt, null);
  // Validate token fields are non-empty
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  // Validate expired_at is in the future
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(authorized.token.expired_at) > new Date(),
  );
  // Validate nested seller object mirrors top-level fields
  TestValidator.equals(
    "seller.id matches top-level id",
    authorized.seller.id,
    authorized.id,
  );
  TestValidator.equals(
    "seller.email matches top-level email",
    authorized.seller.email,
    authorized.email,
  );
  TestValidator.equals(
    "seller.shopName matches top-level shopName",
    authorized.seller.shopName,
    authorized.shopName,
  );
  TestValidator.equals(
    "seller.isBanned matches top-level isBanned",
    authorized.seller.isBanned,
    authorized.isBanned,
  );
  TestValidator.equals(
    "seller.isSuspended matches top-level isSuspended",
    authorized.seller.isSuspended,
    authorized.isSuspended,
  );
  TestValidator.equals(
    "seller.deletedAt matches top-level deletedAt",
    authorized.seller.deletedAt,
    authorized.deletedAt,
  );
}
