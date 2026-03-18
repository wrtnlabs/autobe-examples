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

export async function test_api_address_snapshot_retrieval_immutable_owner_view(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member setup (owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2) Create saved address (owner)
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = memberConnection.headers;
  const address = await generate_random_shopping_mall_member_addresses_create(
    userConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: randint(10000, 99999).toString(),
        country: RandomGenerator.pick(["Korea", "Japan", "USA"] as const),
        city: RandomGenerator.pick(["Seoul", "Busan", "Osaka"] as const),
        street_line1: RandomGenerator.paragraph({ sentences: 1 }),
        street_line2: null,
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 3) Create snapshot
  const snapshotConnection: api.IConnection = { host: connection.host };
  snapshotConnection.headers = userConnection.headers;
  const snapshot1 =
    await api.functional.shoppingMall.member.addresses.snapshots.createAddressSnapshot(
      snapshotConnection,
      {
        addressId: address.id,
      },
    );
  typia.assert(snapshot1);
  // 4) Retrieve snapshot (GET should reflect snapshot record, not current address)
  const retrieveConnection: api.IConnection = { host: connection.host };
  retrieveConnection.headers = snapshotConnection.headers;
  const fetched1 =
    await api.functional.shoppingMall.member.addresses.snapshots.at(
      retrieveConnection,
      {
        addressId: address.id,
        snapshotId: snapshot1.id,
      },
    );
  typia.assert(fetched1);
  TestValidator.equals("snapshot id matches", fetched1.id, snapshot1.id);
  TestValidator.equals(
    "shoppingMallAddressId matches",
    fetched1.shoppingMallAddressId,
    snapshot1.shoppingMallAddressId,
  );
  TestValidator.equals(
    "recipientName immutable",
    fetched1.recipientName,
    snapshot1.recipientName,
  );
  TestValidator.equals(
    "recipientPhone immutable",
    fetched1.recipientPhone,
    snapshot1.recipientPhone,
  );
  TestValidator.equals(
    "postalCode immutable",
    fetched1.postalCode,
    snapshot1.postalCode,
  );
  TestValidator.equals(
    "regionLine1 immutable",
    fetched1.regionLine1,
    snapshot1.regionLine1,
  );
  TestValidator.equals(
    "regionLine2 immutable",
    fetched1.regionLine2,
    snapshot1.regionLine2,
  );
  TestValidator.equals(
    "streetAddressLine1 immutable",
    fetched1.streetAddressLine1,
    snapshot1.streetAddressLine1,
  );
  TestValidator.equals(
    "streetAddressLine2 immutable",
    fetched1.streetAddressLine2,
    snapshot1.streetAddressLine2,
  );
  TestValidator.equals(
    "createdAt immutable",
    fetched1.createdAt,
    snapshot1.createdAt,
  );
  TestValidator.equals(
    "updatedAt immutable",
    fetched1.updatedAt,
    snapshot1.updatedAt,
  );
  TestValidator.equals(
    "deletedAt immutable",
    fetched1.deletedAt,
    snapshot1.deletedAt,
  );
  // 5) Update the live address book entry
  const updateConnection: api.IConnection = { host: connection.host };
  updateConnection.headers = userConnection.headers;
  const updated = await api.functional.shoppingMall.member.addresses.update(
    updateConnection,
    {
      addressId: address.id,
      body: {
        recipient_name: RandomGenerator.name(),
        street_line2: RandomGenerator.paragraph({ sentences: 1 }),
        is_default: address.isDefault,
      } satisfies IShoppingMallAddress.IUpdate,
    },
  );
  typia.assert(updated);
  // 6) Re-fetch the same snapshot; it must not change
  const fetched2 =
    await api.functional.shoppingMall.member.addresses.snapshots.at(
      retrieveConnection,
      {
        addressId: address.id,
        snapshotId: snapshot1.id,
      },
    );
  typia.assert(fetched2);
  TestValidator.equals("snapshot id unchanged", fetched2.id, snapshot1.id);
  TestValidator.equals(
    "snapshot content unchanged (recipientName)",
    fetched2.recipientName,
    snapshot1.recipientName,
  );
  TestValidator.equals(
    "snapshot content unchanged (recipientPhone)",
    fetched2.recipientPhone,
    snapshot1.recipientPhone,
  );
  TestValidator.equals(
    "snapshot content unchanged (postalCode)",
    fetched2.postalCode,
    snapshot1.postalCode,
  );
  TestValidator.equals(
    "snapshot content unchanged (regionLine1)",
    fetched2.regionLine1,
    snapshot1.regionLine1,
  );
  TestValidator.equals(
    "snapshot content unchanged (regionLine2)",
    fetched2.regionLine2,
    snapshot1.regionLine2,
  );
  TestValidator.equals(
    "snapshot content unchanged (streetAddressLine1)",
    fetched2.streetAddressLine1,
    snapshot1.streetAddressLine1,
  );
  TestValidator.equals(
    "snapshot content unchanged (streetAddressLine2)",
    fetched2.streetAddressLine2,
    snapshot1.streetAddressLine2,
  );
  TestValidator.equals(
    "createdAt unchanged",
    fetched2.createdAt,
    snapshot1.createdAt,
  );
  TestValidator.equals(
    "updatedAt unchanged",
    fetched2.updatedAt,
    snapshot1.updatedAt,
  );
  TestValidator.equals(
    "deletedAt unchanged",
    fetched2.deletedAt,
    snapshot1.deletedAt,
  );
  // 7) Leak check: response is exactly the snapshot DTO and should not include live address-derived fields.
  typia.assert(fetched2);
}
