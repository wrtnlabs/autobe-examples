import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_admin_access_any_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 2. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 3. Log in as admin using the original credentials
  const adminLoginBody: IShoppingMallAdmin.ILogin = {
    email: adminEmail, // Use original email, not from response
    password: adminPassword, // Use original password, not from response
  };
  const adminLoggedIn = await authorize_admin_login(adminConnection, {
    body: adminLoginBody,
  });
  typia.assert(adminLoggedIn);
  // 4. Generate a random, valid IShoppingMallOrderItemSnapshot structure
  const randomSnapshot = typia.random<IShoppingMallOrderItemSnapshot>();
  typia.assert(randomSnapshot);
  // 5. Extract the snapshot ID from the generated snapshot
  const snapshotId = randomSnapshot.id;
  // 6. Admin accesses the snapshot by ID - ownership bypass test
  // The endpoint should return the snapshot structure if the system properly allows admin access
  // Even though this snapshot doesn't "exist" in the database, the simulator will return it
  const retrievedSnapshot =
    await api.functional.shoppingMall.seller.order_item_snapshots.at(
      adminConnection,
      {
        snapshotId,
      },
    );
  typia.assert(retrievedSnapshot);
  // 7. Validate that the retrieved snapshot matches the generated snapshot structure
  TestValidator.equals("snapshot ID matches", retrievedSnapshot.id, snapshotId);
  TestValidator.equals(
    "snapshot product name matches",
    retrievedSnapshot.product_name,
    randomSnapshot.product_name,
  );
  TestValidator.equals(
    "snapshot variant SKU matches",
    retrievedSnapshot.variant_sku,
    randomSnapshot.variant_sku,
  );
  TestValidator.equals(
    "snapshot seller_id matches",
    retrievedSnapshot.seller_id,
    randomSnapshot.seller_id,
  );
  TestValidator.equals(
    "snapshot order_item_id matches",
    retrievedSnapshot.order_item_id,
    randomSnapshot.order_item_id,
  );
  TestValidator.equals(
    "snapshot product_id matches",
    retrievedSnapshot.product_id,
    randomSnapshot.product_id,
  );
  TestValidator.equals(
    "snapshot variant_id matches",
    retrievedSnapshot.variant_id,
    randomSnapshot.variant_id,
  );
  TestValidator.equals(
    "snapshot created_at matches",
    retrievedSnapshot.created_at,
    randomSnapshot.created_at,
  );
  TestValidator.equals(
    "snapshot snapshot_hash matches",
    retrievedSnapshot.snapshot_hash,
    randomSnapshot.snapshot_hash,
  );
  TestValidator.equals(
    "snapshot shop_name matches",
    retrievedSnapshot.shop_name,
    randomSnapshot.shop_name,
  );
  TestValidator.equals(
    "snapshot category_id matches",
    retrievedSnapshot.category_id,
    randomSnapshot.category_id,
  );
  TestValidator.equals(
    "snapshot thumbnail_image_url matches",
    retrievedSnapshot.thumbnail_image_url,
    randomSnapshot.thumbnail_image_url,
  );
  TestValidator.equals(
    "snapshot all_product_images matches",
    retrievedSnapshot.all_product_images,
    randomSnapshot.all_product_images,
  );
  TestValidator.equals(
    "snapshot option_values matches",
    retrievedSnapshot.option_values,
    randomSnapshot.option_values,
  );
  TestValidator.equals(
    "snapshot stock_at_time_of_purchase matches",
    retrievedSnapshot.stock_at_time_of_purchase,
    randomSnapshot.stock_at_time_of_purchase,
  );
  TestValidator.equals(
    "snapshot variant_price matches",
    retrievedSnapshot.variant_price,
    randomSnapshot.variant_price,
  );
  TestValidator.equals(
    "snapshot base_price matches",
    retrievedSnapshot.base_price,
    randomSnapshot.base_price,
  );
  TestValidator.equals(
    "snapshot shop_description matches",
    retrievedSnapshot.shop_description,
    randomSnapshot.shop_description,
  );
  TestValidator.equals(
    "snapshot logo_image_url matches",
    retrievedSnapshot.logo_image_url,
    randomSnapshot.logo_image_url,
  );
}
