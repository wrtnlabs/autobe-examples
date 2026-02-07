import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_ecommerce_sellers_seller_profile_snapshots_create } from "../../../generate/generate_random_ecommerce_sellers_seller_profile_snapshots_create";
import { prepare_random_ecommerce_seller_profile_snapshot } from "../../../prepare/prepare_random_ecommerce_seller_profile_snapshot";

export async function test_api_seller_profile_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 2. Create seller profile snapshot
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot =
    await generate_random_ecommerce_sellers_seller_profile_snapshots_create(
      connection,
      {
        params: { sellerId },
      },
    );
  typia.assert(snapshot);
  // 3. Retrieve snapshot
  const retrievedSnapshot =
    await api.functional.ecommerce.sellers.seller_profile_snapshots.at(
      connection,
      {
        sellerId: snapshot.sellerProfile.seller.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 4. Validate all fields
  TestValidator.equals(
    "seller profile matches",
    retrievedSnapshot.sellerProfile.id,
    snapshot.sellerProfile.id,
  );
  TestValidator.equals(
    "shop name before matches",
    retrievedSnapshot.shop_name_before,
    snapshot.shop_name_before,
  );
  TestValidator.equals(
    "shop name after matches",
    retrievedSnapshot.shop_name_after,
    snapshot.shop_name_after,
  );
  TestValidator.equals(
    "description before matches",
    retrievedSnapshot.description_before,
    snapshot.description_before,
  );
  TestValidator.equals(
    "description after matches",
    retrievedSnapshot.description_after,
    snapshot.description_after,
  );
  TestValidator.equals(
    "logo before matches",
    retrievedSnapshot.logo_before,
    snapshot.logo_before,
  );
  TestValidator.equals(
    "logo after matches",
    retrievedSnapshot.logo_after,
    snapshot.logo_after,
  );
  TestValidator.equals(
    "timestamp format",
    retrievedSnapshot.created_at,
    snapshot.created_at,
  );
}
