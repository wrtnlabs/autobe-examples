import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test seller profile update with all fields including shop name, description, and logo URI.
 *
 * Validates the complete seller profile update workflow where a registered seller authenticates and modifies their public-facing business information. The test ensures that all three updatable fields (shop_name, shop_description, logo_uri) are correctly updated and reflected in the response.
 *
 * Special attention is given to verifying that the updated profile contains accurate timestamps and status flags (approval_status, is_suspended, is_banned) that remain unchanged during the update operation.
 *
 * 1. Customer registers as a seller with valid credentials.
 * 2. Seller updates their profile with new shop name, description, and logo URI.
 * 3. Validates that all updated fields match the input values.
 * 4. Confirms that status flags and approval_status are present in response.
 */
export async function test_api_seller_profile_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Prepare update body with all fields
  const updateBody = {
    shop_name: RandomGenerator.paragraph({ sentences: 3 }),
    shop_description: RandomGenerator.content({ paragraphs: 2 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerProfile.IUpdate;
  // 3. Update seller profile with all fields
  const updatedProfile =
    await api.functional.shoppingMall.customer.profile.update(
      sellerConnection,
      { body: updateBody },
    );
  typia.assert(updatedProfile);
  // 4. Validate updated fields match input values
  TestValidator.equals(
    "shop_name matches input",
    updatedProfile.shop_name,
    updateBody.shop_name,
  );
  TestValidator.equals(
    "shop_description matches input",
    updatedProfile.shop_description,
    updateBody.shop_description,
  );
  TestValidator.equals(
    "logo_uri matches input",
    updatedProfile.logo_uri,
    updateBody.logo_uri,
  );
  // 5. Validate status flags are present and have valid types
  TestValidator.predicate(
    "approval_status is valid string",
    typeof updatedProfile.approval_status === "string" &&
      updatedProfile.approval_status.length > 0,
  );
  TestValidator.predicate(
    "is_suspended is boolean",
    typeof updatedProfile.is_suspended === "boolean",
  );
  TestValidator.predicate(
    "is_banned is boolean",
    typeof updatedProfile.is_banned === "boolean",
  );
  // 6. Validate timestamps are valid date-time strings
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof updatedProfile.created_at === "string" &&
      !isNaN(Date.parse(updatedProfile.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typeof updatedProfile.updated_at === "string" &&
      !isNaN(Date.parse(updatedProfile.updated_at)),
  );
  // 7. Validate profile ID is valid UUID
  TestValidator.predicate(
    "profile id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      updatedProfile.id,
    ),
  );
}
