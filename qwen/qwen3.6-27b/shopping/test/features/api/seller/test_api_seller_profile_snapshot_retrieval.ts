import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
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
 * Validates seller profile snapshot retrieval for authenticated sellers.
 *
 * Tests that an authenticated seller can successfully retrieve a seller profile snapshot
 * from their profile modification history. The snapshot captures the exact profile
 * state at the time of modification, providing an immutable audit trail for historical
 * tracking and dispute resolution.
 *
 * 1. Register and authenticate a seller account.
 * 2. Retrieve a profile snapshot using a valid snapshotId (UUID format).
 * 3. Validate the response structure matches IEcommercePlatformSnapshotSellerProfile.
 * 4. Verify snapshot metadata, entity type, and profile state fields.
 */
export async function test_api_seller_profile_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Generate a valid snapshot UUID
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the seller profile snapshot
  const snapshot =
    await api.functional.ecommercePlatform.seller.profile_snapshots.at(
      sellerConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot response structure
  TestValidator.equals("snapshot id is valid UUID", snapshot.id, snapshotId);
  TestValidator.equals(
    "entity type is seller_profile",
    snapshot.entityType,
    "seller_profile",
  );
  // 5. Validate timestamp fields are valid date-time format
  TestValidator.predicate("snapshotCreatedAt is valid date-time", () => {
    const date = new Date(snapshot.snapshotCreatedAt);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("createdAt is valid date-time", () => {
    const date = new Date(snapshot.createdAt);
    return !isNaN(date.getTime());
  });
  // 6. Validate seller profile reference is valid UUID
  TestValidator.predicate("sellerProfileId is valid UUID", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(snapshot.sellerProfileId);
  });
  // 7. Validate seller summary reference structure
  typia.assert(snapshot.seller);
  TestValidator.predicate("seller summary has valid UUID", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(snapshot.seller.id);
  });
  TestValidator.predicate("seller summary has valid email", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(snapshot.seller.email);
  });
  // 8. Validate nullable before-and-after fields structure
  TestValidator.predicate("previousShopName is null or string", () => {
    return (
      snapshot.previousShopName === null ||
      typeof snapshot.previousShopName === "string"
    );
  });
  TestValidator.predicate("currentShopName is null or string", () => {
    return (
      snapshot.currentShopName === null ||
      typeof snapshot.currentShopName === "string"
    );
  });
  TestValidator.predicate("previousShopDescription is null or string", () => {
    return (
      snapshot.previousShopDescription === null ||
      typeof snapshot.previousShopDescription === "string"
    );
  });
  TestValidator.predicate("currentShopDescription is null or string", () => {
    return (
      snapshot.currentShopDescription === null ||
      typeof snapshot.currentShopDescription === "string"
    );
  });
  TestValidator.predicate("previousLogoUri is null or string", () => {
    return (
      snapshot.previousLogoUri === null ||
      typeof snapshot.previousLogoUri === "string"
    );
  });
  TestValidator.predicate("currentLogoUri is null or string", () => {
    return (
      snapshot.currentLogoUri === null ||
      typeof snapshot.currentLogoUri === "string"
    );
  });
}
