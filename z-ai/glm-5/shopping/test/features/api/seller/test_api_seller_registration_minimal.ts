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

export async function test_api_seller_registration_minimal(
  connection: api.IConnection,
): Promise<void> {
  // Prepare minimal registration data - only required fields
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name(1);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const body = {
    email,
    password,
    shop_name: shopName,
    href,
    referrer,
    // Omit optional fields: shop_description, logo_image, ip
  } satisfies IShoppingMallSeller.IJoin;
  // Submit registration request
  const response = await api.functional.shoppingMall.auth.seller.join(
    connection,
    { body },
  );
  typia.assert(response);
  // Validate business logic - optional fields correctly defaulted to null
  TestValidator.equals("email matches", response.email, email.toLowerCase());
  TestValidator.equals("shopName matches", response.shopName, shopName);
  TestValidator.equals(
    "shopDescription is null",
    response.shopDescription,
    null,
  );
  TestValidator.equals("logoImage is null", response.logoImage, null);
  TestValidator.equals(
    "approval_status is pending",
    response.approval_status,
    "pending",
  );
  TestValidator.equals(
    "rejection_reason is null",
    response.rejection_reason,
    null,
  );
  TestValidator.equals("suspended is false", response.suspended, false);
  TestValidator.equals("banned is false", response.banned, false);
}
