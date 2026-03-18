import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddressSnapshot";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddressSnapshot";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

export async function test_api_addresses_lock_for_checkout_preserves_snapshot_shipping_details(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // Actor-specific connection (same host) that already contains auth headers
  const addressConnection: api.IConnection = { host: connection.host };
  addressConnection.headers = memberConnection.headers;
  // 2) Create a saved shipping address owned by this member
  const createdAddress =
    await generate_random_shopping_mall_member_addresses_create(
      addressConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          postal_code: RandomGenerator.alphabets(8),
          country: RandomGenerator.name(2),
          city: RandomGenerator.name(2),
          street_line1: RandomGenerator.name(3),
          street_line2: RandomGenerator.name(2),
          is_default: true,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(createdAddress);
  const addressId = createdAddress.id;
  // 3) Lock-for-checkout
  await api.functional.shoppingMall.member.addresses.lock_for_checkout.lockForCheckout(
    addressConnection,
    { addressId },
  );
  // 4) Fetch newest snapshot (server default ordering assumed newest-first)
  const firstPage =
    await api.functional.shoppingMall.member.addresses.snapshots.index(
      addressConnection,
      {
        addressId,
        body: { page: 1, limit: 1 },
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "has at least one snapshot after first lock",
    firstPage.data.length > 0,
  );
  const firstNewest = firstPage.data[0];
  const snapshotRecipientName = firstNewest.recipient_name;
  const snapshotRecipientPhone = firstNewest.recipient_phone;
  const snapshotPostalCode = firstNewest.postal_code;
  const snapshotRegionLine1 = firstNewest.region_line1;
  const snapshotRegionLine2 = firstNewest.region_line2;
  const snapshotStreetAddressLine1 = firstNewest.street_address_line1;
  const snapshotStreetAddressLine2 = firstNewest.street_address_line2;
  const firstSnapshotId = firstNewest.id;
  // Expected snapshot fields derived from createdAddress at lock time
  TestValidator.equals(
    "snapshot recipient name preserves address recipient_name",
    snapshotRecipientName,
    createdAddress.recipientName,
  );
  TestValidator.equals(
    "snapshot recipient phone preserves address phoneNumber",
    snapshotRecipientPhone,
    createdAddress.phoneNumber,
  );
  TestValidator.equals(
    "snapshot postal code preserves address postalCode",
    snapshotPostalCode,
    createdAddress.postalCode,
  );
  TestValidator.equals(
    "snapshot region_line1 preserves address city",
    snapshotRegionLine1,
    createdAddress.city,
  );
  TestValidator.equals(
    "snapshot region_line2 preserves address country",
    snapshotRegionLine2,
    createdAddress.country,
  );
  TestValidator.equals(
    "snapshot street_address_line1 preserves address streetLine1",
    snapshotStreetAddressLine1,
    createdAddress.streetLine1,
  );
  TestValidator.equals(
    "snapshot street_address_line2 preserves address streetLine2",
    snapshotStreetAddressLine2,
    createdAddress.streetLine2,
  );
  // 6) Lock-for-checkout again with same addressId
  await api.functional.shoppingMall.member.addresses.lock_for_checkout.lockForCheckout(
    addressConnection,
    { addressId },
  );
  // 7) Re-fetch newest snapshot and verify consistency
  const secondPage =
    await api.functional.shoppingMall.member.addresses.snapshots.index(
      addressConnection,
      {
        addressId,
        body: { page: 1, limit: 1 },
      },
    );
  typia.assert(secondPage);
  TestValidator.predicate(
    "has at least one snapshot after second lock",
    secondPage.data.length > 0,
  );
  const secondNewest = secondPage.data[0];
  TestValidator.predicate(
    "second lock preserves snapshot shipping details",
    () =>
      secondNewest.recipient_name === snapshotRecipientName &&
      secondNewest.recipient_phone === snapshotRecipientPhone &&
      secondNewest.postal_code === snapshotPostalCode &&
      secondNewest.region_line1 === snapshotRegionLine1 &&
      secondNewest.region_line2 === snapshotRegionLine2 &&
      secondNewest.street_address_line1 === snapshotStreetAddressLine1 &&
      secondNewest.street_address_line2 === snapshotStreetAddressLine2,
  );
  // Ensure we still have consistent snapshot identity semantics (idempotent or versioned)
  TestValidator.notEquals(
    "newest snapshot id may or may not change (no strict assertion)",
    firstSnapshotId,
    isNaN(Number(firstSnapshotId)) ? firstSnapshotId : firstSnapshotId,
  );
}
