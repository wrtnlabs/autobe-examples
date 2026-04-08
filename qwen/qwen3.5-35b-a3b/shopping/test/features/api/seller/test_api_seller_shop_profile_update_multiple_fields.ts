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

export async function test_api_seller_shop_profile_update_multiple_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // Step 2: Create initial shop profile
  const initialProfile =
    await api.functional.ecommerceMall.seller.shop_profiles.patch(
      sellerConnection,
      {
        body: {
          shop_name: "Original Shop",
          shop_description: "Initial description",
          logo_url: "https://example.com/logo1.png",
        },
      },
    );
  typia.assert(initialProfile);
  // Step 3: Record initial values for verification
  const originalValues = {
    shop_name: initialProfile.shop_name,
    shop_description: initialProfile.shop_description,
    logo_url: initialProfile.logo_url,
  };
  // Step 4: Send PATCH with all three fields updated
  const firstUpdate =
    await api.functional.ecommerceMall.seller.shop_profiles.patch(
      sellerConnection,
      {
        body: {
          shop_name: "Updated Shop Name",
          shop_description: "Updated business description text",
          logo_url: "https://example.com/new-logo.png",
        },
      },
    );
  typia.assert(firstUpdate);
  // Step 5: Verify response shows updated values
  TestValidator.equals(
    "shop_name updated",
    firstUpdate.shop_name,
    "Updated Shop Name",
  );
  TestValidator.equals(
    "shop_description updated",
    firstUpdate.shop_description,
    "Updated business description text",
  );
  TestValidator.equals(
    "logo_url updated",
    firstUpdate.logo_url,
    "https://example.com/new-logo.png",
  );
  // Step 6: Verify exactly one snapshot created
  TestValidator.equals("snapshot count", firstUpdate.snapshots.length, 1);
  // Step 7: Verify snapshot contains original values (before update)
  const snapshot1 = firstUpdate.snapshots[0];
  typia.assert(snapshot1);
  TestValidator.equals(
    "snapshot shop_name original",
    snapshot1.shop_name,
    originalValues.shop_name,
  );
  TestValidator.equals(
    "snapshot shop_description original",
    snapshot1.shop_description,
    originalValues.shop_description,
  );
  TestValidator.equals(
    "snapshot logo_url original",
    snapshot1.logo_url,
    originalValues.logo_url,
  );
  // Step 8: Update with partial fields (only shop_name and logo_url, no description)
  const secondUpdate =
    await api.functional.ecommerceMall.seller.shop_profiles.patch(
      sellerConnection,
      {
        body: {
          shop_name: "Second Update Shop",
          logo_url: "https://example.com/second-logo.png",
        },
      },
    );
  typia.assert(secondUpdate);
  // Step 9: Verify second snapshot created with first update's values
  TestValidator.equals(
    "snapshot count after second update",
    secondUpdate.snapshots.length,
    2,
  );
  const snapshot2 = secondUpdate.snapshots[1];
  typia.assert(snapshot2);
  TestValidator.equals(
    "snapshot 2 shop_name from first update",
    snapshot2.shop_name,
    "Updated Shop Name",
  );
  TestValidator.equals(
    "snapshot 2 logo_url from first update",
    snapshot2.logo_url,
    "https://example.com/new-logo.png",
  );
  // Step 10: Verify shop profile shows current values after last update
  TestValidator.equals(
    "current shop_name after second update",
    secondUpdate.shop_name,
    "Second Update Shop",
  );
  TestValidator.equals(
    "current logo_url after second update",
    secondUpdate.logo_url,
    "https://example.com/second-logo.png",
  );
  // Description should remain from first update (not changed in second update)
  TestValidator.equals(
    "current shop_description unchanged",
    secondUpdate.shop_description,
    "Updated business description text",
  );
  // Step 11: Verify snapshot history shows chronological sequence
  TestValidator.notEquals("snapshots different", snapshot1, snapshot2);
  TestValidator.predicate(
    "snapshots chronological order",
    snapshot1.created_at < snapshot2.created_at,
  );
}
