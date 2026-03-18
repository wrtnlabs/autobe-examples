import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_address_snapshot_create_for_owned_address(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Create a shipping address owned by the member
  const createdAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          postal_code: RandomGenerator.alphabets(5),
          country: RandomGenerator.name(1),
          city: RandomGenerator.name(1),
          street_line1: RandomGenerator.alphabets(10),
          street_line2: null,
          is_default: false,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(createdAddress);
  const addressId = createdAddress.id;
  // 3) Capture scalar fields from the created address response
  const captured: {
    recipientName: string;
    phoneNumber: string;
    postalCode: string;
    country: string;
    city: string;
    streetLine1: string;
    streetLine2: string | null;
  } = {
    recipientName: createdAddress.recipientName,
    phoneNumber: createdAddress.phoneNumber,
    postalCode: createdAddress.postalCode,
    country: createdAddress.country,
    city: createdAddress.city,
    streetLine1: createdAddress.streetLine1,
    streetLine2: createdAddress.streetLine2,
  };
  // 4) Create snapshot
  const snapshot =
    await api.functional.shoppingMall.member.addresses.snapshots.createAddressSnapshot(
      memberConnection,
      { addressId },
    );
  typia.assert(snapshot);
  // 5) Identity
  TestValidator.equals(
    "snapshot shoppingMallAddressId matches input addressId",
    snapshot.shoppingMallAddressId,
    addressId,
  );
  // 6) Snapshot content equivalence (mapping by semantic field names)
  TestValidator.equals(
    "recipientName matches",
    snapshot.recipientName,
    captured.recipientName,
  );
  TestValidator.equals(
    "recipientPhone matches",
    snapshot.recipientPhone,
    captured.phoneNumber,
  );
  TestValidator.equals(
    "postalCode matches",
    snapshot.postalCode,
    captured.postalCode,
  );
  TestValidator.equals(
    "regionLine1 matches city",
    snapshot.regionLine1,
    captured.city,
  );
  TestValidator.equals(
    "regionLine2 matches country",
    snapshot.regionLine2,
    captured.country,
  );
  TestValidator.equals(
    "streetAddressLine1 matches streetLine1",
    snapshot.streetAddressLine1,
    captured.streetLine1,
  );
  TestValidator.equals(
    "streetAddressLine2 matches streetLine2",
    snapshot.streetAddressLine2,
    captured.streetLine2,
  );
  // 7) Audit fields
  TestValidator.equals("deletedAt is null", snapshot.deletedAt, null);
  // 8) Update original address
  const updated = await api.functional.shoppingMall.member.addresses.update(
    memberConnection,
    {
      addressId,
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphabets(5),
        country: RandomGenerator.name(1),
        city: RandomGenerator.name(1),
        street_line1: RandomGenerator.alphabets(12),
        street_line2: RandomGenerator.alphabets(6),
        is_default: false,
      } satisfies IShoppingMallAddress.IUpdate,
    },
  );
  typia.assert(updated);
  // 9) Re-fetch snapshot and verify immutability
  const refetched =
    await api.functional.shoppingMall.member.addresses.snapshots.at(
      memberConnection,
      {
        addressId,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(refetched);
  TestValidator.equals("snapshot id unchanged", refetched.id, snapshot.id);
  TestValidator.equals(
    "shoppingMallAddressId unchanged",
    refetched.shoppingMallAddressId,
    snapshot.shoppingMallAddressId,
  );
  TestValidator.equals(
    "recipientName immutable",
    refetched.recipientName,
    snapshot.recipientName,
  );
  TestValidator.equals(
    "recipientPhone immutable",
    refetched.recipientPhone,
    snapshot.recipientPhone,
  );
  TestValidator.equals(
    "postalCode immutable",
    refetched.postalCode,
    snapshot.postalCode,
  );
  TestValidator.equals(
    "regionLine1 immutable",
    refetched.regionLine1,
    snapshot.regionLine1,
  );
  TestValidator.equals(
    "regionLine2 immutable",
    refetched.regionLine2,
    snapshot.regionLine2,
  );
  TestValidator.equals(
    "streetAddressLine1 immutable",
    refetched.streetAddressLine1,
    snapshot.streetAddressLine1,
  );
  TestValidator.equals(
    "streetAddressLine2 immutable",
    refetched.streetAddressLine2,
    snapshot.streetAddressLine2,
  );
  TestValidator.equals(
    "createdAt immutable",
    refetched.createdAt,
    snapshot.createdAt,
  );
  TestValidator.equals(
    "updatedAt immutable",
    refetched.updatedAt,
    snapshot.updatedAt,
  );
  TestValidator.equals(
    "deletedAt immutable",
    refetched.deletedAt,
    snapshot.deletedAt,
  );
}
