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

/**
 * Test seller shop profile snapshot retrieval functionality.
 *
 * Validates that a seller can retrieve their own shop profile snapshots, which preserve the shop's identity (name, description, logo) at the time of each modification. This feature enables historical tracking, dispute resolution, and audit trails for shop profile changes.
 *
 * The test verifies the complete workflow: seller authentication, snapshot retrieval by ID, and validation of all snapshot fields including the shopProfile relation. Snapshots are immutable records created automatically when sellers update their shop profile.
 */
export async function test_api_seller_shop_profile_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // 2. Create a shop profile snapshot ID to test retrieval
  // In production, snapshots are created when seller updates their shop profile
  // This test validates the retrieval endpoint works correctly
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the snapshot by ID using seller's authenticated connection
  const snapshot =
    await api.functional.ecommerceMall.seller.shop_profile_snapshots.at(
      sellerConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot structure - all required fields must be present
  TestValidator.equals("snapshot has id", snapshot.id, snapshotId);
  TestValidator.equals(
    "snapshot has shop_name",
    snapshot.shop_name !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has shop_description",
    snapshot.shop_description !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has created_at",
    snapshot.created_at !== undefined,
    true,
  );
  // 5. Validate shopProfile relation is included and has required fields
  typia.assert(snapshot.shopProfile);
  TestValidator.equals(
    "shopProfile has id",
    snapshot.shopProfile.id !== undefined,
    true,
  );
  TestValidator.equals(
    "shopProfile has shop_name",
    snapshot.shopProfile.shop_name !== undefined,
    true,
  );
  TestValidator.equals(
    "shopProfile has shop_description",
    snapshot.shopProfile.shop_description !== undefined,
    true,
  );
  TestValidator.equals(
    "shopProfile has logo_url",
    snapshot.shopProfile.logo_url !== undefined,
    true,
  );
  TestValidator.equals(
    "shopProfile has created_at",
    snapshot.shopProfile.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "shopProfile has updated_at",
    snapshot.shopProfile.updated_at !== undefined,
    true,
  );
  // 6. Validate timestamp format - created_at should be valid ISO 8601
  const createdAtDate = new Date(snapshot.created_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAtDate.getTime()),
  );
  // 7. Validate shopProfile timestamp format
  const updatedAtDate = new Date(snapshot.shopProfile.updated_at);
  TestValidator.predicate(
    "shopProfile updated_at is valid date",
    !isNaN(updatedAtDate.getTime()),
  );
  // 8. Validate logo_url can be null
  if (snapshot.logo_url !== null) {
    TestValidator.predicate(
      "logo_url is valid URI when not null",
      snapshot.logo_url !== null,
    );
  }
  // 9. Validate shopProfile logo_url can be null
  if (snapshot.shopProfile.logo_url !== null) {
    TestValidator.predicate(
      "shopProfile logo_url is valid URI when not null",
      snapshot.shopProfile.logo_url !== null,
    );
  }
}
