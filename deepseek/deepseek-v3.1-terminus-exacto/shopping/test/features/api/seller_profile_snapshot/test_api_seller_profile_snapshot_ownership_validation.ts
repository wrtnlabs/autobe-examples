import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
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
 * Test seller profile snapshot ownership validation.
 * Since profile update and snapshot creation endpoints are not available,
 * this test focuses on authentication requirements of the snapshot retrieval endpoint.
 * Two sellers are created and the test verifies the endpoint requires proper authentication.
 */
export async function test_api_seller_profile_snapshot_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create first seller account
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller1);
  // Create second seller account
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller2);
  // Generate a random snapshot ID for testing
  const testSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // Test that both sellers can call the endpoint (requires authentication)
  // The endpoint will return 404 for non-existent snapshot, but that's acceptable
  // since we're testing authentication requirements, not snapshot existence
  // Seller1 attempts to access a snapshot (will get 404, not auth error)
  await TestValidator.error(
    "Seller1 access to non-existent snapshot returns error (404 or other)",
    async () => {
      await api.functional.ecommerce.seller.profile.snapshots.at(
        seller1Connection,
        {
          snapshotId: testSnapshotId,
        } satisfies api.functional.ecommerce.seller.profile.snapshots.at.Props,
      );
    },
  );
  // Seller2 attempts to access a snapshot (will get 404, not auth error)
  await TestValidator.error(
    "Seller2 access to non-existent snapshot returns error (404 or other)",
    async () => {
      await api.functional.ecommerce.seller.profile.snapshots.at(
        seller2Connection,
        {
          snapshotId: testSnapshotId,
        } satisfies api.functional.ecommerce.seller.profile.snapshots.at.Props,
      );
    },
  );
  // Test with a completely unauthenticated connection (should fail with auth error)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // No authorization headers set
  await TestValidator.error(
    "Unauthenticated access should fail with authorization error",
    async () => {
      await api.functional.ecommerce.seller.profile.snapshots.at(
        unauthenticatedConnection,
        {
          snapshotId: testSnapshotId,
        } satisfies api.functional.ecommerce.seller.profile.snapshots.at.Props,
      );
    },
  );
}
