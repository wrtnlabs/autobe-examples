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

export async function test_api_address_snapshot_retrieval_mismatched_parent_or_missing_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Address C and snapshot C
  const addressC = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphabets(6),
        country: RandomGenerator.alphabets(5),
        city: RandomGenerator.alphabets(7),
        street_line1: RandomGenerator.alphabets(10),
        street_line2: null,
        is_default: false,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  const snapshotC =
    await api.functional.shoppingMall.member.addresses.snapshots.createAddressSnapshot(
      memberConnection,
      { addressId: addressC.id },
    );
  typia.assert(snapshotC);
  // Address D and snapshot D
  const addressD = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphabets(6),
        country: RandomGenerator.alphabets(5),
        city: RandomGenerator.alphabets(7),
        street_line1: RandomGenerator.alphabets(10),
        street_line2: null,
        is_default: false,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  const snapshotD =
    await api.functional.shoppingMall.member.addresses.snapshots.createAddressSnapshot(
      memberConnection,
      { addressId: addressD.id },
    );
  typia.assert(snapshotD);
  // Test case A: mismatched parent pairing (Address C + Snapshot D) must fail
  await TestValidator.error(
    "mismatched parent pairing should not return snapshot",
    async () => {
      await api.functional.shoppingMall.member.addresses.snapshots.at(
        memberConnection,
        {
          addressId: addressC.id,
          snapshotId: snapshotD.id,
        },
      );
    },
  );
  // Test case B: missing snapshotId must fail
  const missingSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "missing snapshot id should not return snapshot",
    async () => {
      await api.functional.shoppingMall.member.addresses.snapshots.at(
        memberConnection,
        {
          addressId: addressC.id,
          snapshotId: missingSnapshotId,
        },
      );
    },
  );
  // Control: correct pairing still returns snapshot content
  const snapshotCAgain =
    await api.functional.shoppingMall.member.addresses.snapshots.at(
      memberConnection,
      {
        addressId: addressC.id,
        snapshotId: snapshotC.id,
      },
    );
  typia.assert(snapshotCAgain);
  TestValidator.equals(
    "correct pairing should return the snapshot",
    snapshotCAgain.id,
    snapshotC.id,
  );
}
