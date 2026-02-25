import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create customer account first
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MaxLength<255>>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Register as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const output = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MaxLength<255>>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: null,
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(output);
  // Validate response structure
  TestValidator.equals("has id", typeof output.id, "string");
  TestValidator.equals("has shop_name", typeof output.shop_name, "string");
  TestValidator.equals(
    "shop_description is null",
    output.shop_description,
    null,
  );
  TestValidator.equals("logo_image_url is null", output.logo_image_url, null);
  TestValidator.equals(
    "approval_status is pending",
    output.approval_status,
    "pending",
  );
  TestValidator.equals("has created_at", typeof output.created_at, "string");
  TestValidator.equals("has updated_at", typeof output.updated_at, "string");
  // Validate nested data structure
  TestValidator.equals("has profile", output.data !== undefined, true);
  TestValidator.equals(
    "profile has id",
    typeof output.data.profile.id,
    "string",
  );
  TestValidator.equals(
    "profile has shop_name",
    typeof output.data.profile.shop_name,
    "string",
  );
  TestValidator.equals(
    "profile has approval_status",
    typeof output.data.profile.approval_status,
    "string",
  );
  TestValidator.equals(
    "profile has created_at",
    typeof output.data.profile.created_at,
    "string",
  );
  // Validate token structure
  TestValidator.equals("has token", output.token !== undefined, true);
  TestValidator.equals(
    "token has access",
    typeof output.token.access,
    "string",
  );
  TestValidator.equals(
    "token has refresh",
    typeof output.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token has expired_at",
    typeof output.token.expired_at,
    "string",
  );
  // Validate meta structure
  TestValidator.equals("meta version is 1.0", output.meta.version, "1.0");
}