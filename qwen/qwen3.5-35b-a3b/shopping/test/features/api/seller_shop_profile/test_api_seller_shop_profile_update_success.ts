import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import type { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shop_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create initial shop profile (PATCH creates if not exists)
  const initialShopName = RandomGenerator.paragraph({
    sentences: 2,
  }) satisfies string;
  const initialDescription = RandomGenerator.paragraph({
    sentences: 3,
  }) satisfies string | null;
  const initialLogoUrl = typia.random<string & tags.Format<"uri">>() satisfies
    | (string & tags.Format<"uri">)
    | null;
  const existingProfile =
    await api.functional.ecommerceMall.seller.shop_profiles.patch(
      sellerConnection,
      {
        body: {
          shop_name: initialShopName,
          shop_description: initialDescription,
          logo_url: typia.assert<string & tags.Format<"uri"> & tags.MaxLength<80000>>(initialLogoUrl),
        } satisfies IEcommerceMallShopProfile.IUpdate,
      },
    );
  typia.assert(existingProfile);
  // Capture old values before update
  const oldShopName = existingProfile.shop_name;
  const oldDescription = existingProfile.shop_description;
  const oldLogoUrl = existingProfile.logo_url;
  const oldUpdatedAt = existingProfile.updated_at;
  // 3. Prepare new update values
  const newShopName = RandomGenerator.paragraph({
    sentences: 3,
  }) satisfies string;
  const newDescription = RandomGenerator.content({ paragraphs: 1 }) satisfies
    | string
    | null;
  const newLogoUrl: (string & tags.Format<"uri"> & tags.MaxLength<80000>) | null = typia.random<
    string & tags.Format<"uri"> & tags.MaxLength<80000>
  >();
  // 4. Send PATCH request with updates
  const updatedProfile =
    await api.functional.ecommerceMall.seller.shop_profiles.patch(
      sellerConnection,
      {
        body: {
          shop_name: newShopName,
          shop_description: newDescription,
          logo_url: newLogoUrl,
        } satisfies IEcommerceMallShopProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 5. Verify response contains updated values
  TestValidator.equals(
    "shop name updated",
    updatedProfile.shop_name,
    newShopName,
  );
  TestValidator.equals(
    "shop description updated",
    updatedProfile.shop_description,
    newDescription,
  );
  TestValidator.equals("logo URL updated", updatedProfile.logo_url, newLogoUrl);
  // 6. Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    oldUpdatedAt,
    updatedProfile.updated_at,
  );
  // 7. Verify exactly one snapshot was created
  const snapshots = updatedProfile.snapshots;
  TestValidator.equals("exactly one snapshot created", snapshots.length, 1);
  // 8. Verify snapshot contains OLD values (before update)
  const snapshot = snapshots[0];
  TestValidator.equals(
    "snapshot preserves old shop name",
    snapshot.shop_name,
    oldShopName,
  );
  TestValidator.equals(
    "snapshot preserves old description",
    snapshot.shop_description,
    oldDescription,
  );
  TestValidator.equals(
    "snapshot preserves old logo URL",
    snapshot.logo_url,
    oldLogoUrl,
  );
  // 9. Verify seller identity preserved
  TestValidator.equals(
    "seller identity preserved",
    updatedProfile.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller display_name preserved",
    updatedProfile.seller.display_name,
    sellerAuth.display_name,
  );
  // 10. Verify snapshot has required fields
  TestValidator.notEquals("snapshot has valid ID", snapshot.id, null);
  TestValidator.notEquals(
    "snapshot has valid profile ID",
    snapshot.ecommerce_mall_shop_profile_id,
    null,
  );
  TestValidator.notEquals(
    "snapshot has created timestamp",
    snapshot.created_at,
    null,
  );
}