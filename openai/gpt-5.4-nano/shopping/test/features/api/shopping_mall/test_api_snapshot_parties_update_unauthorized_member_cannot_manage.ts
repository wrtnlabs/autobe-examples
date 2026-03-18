import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddressSnapshot";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
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

export async function test_api_snapshot_parties_update_unauthorized_member_cannot_manage(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberA);
  // 2) Authenticate Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberB);
  // 3) As Member A, create an address
  const addressA = await generate_random_shopping_mall_member_addresses_create(
    memberAConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: RandomGenerator.alphabets(5),
        country: "Korea",
        city: RandomGenerator.name(1),
        street_line1: RandomGenerator.name(2),
        street_line2: null,
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(addressA);
  // 4) As Member A, create snapshot
  const snapshotA =
    await api.functional.shoppingMall.member.addresses.snapshots.createAddressSnapshot(
      memberAConnection,
      {
        addressId: addressA.id,
      },
    );
  typia.assert(snapshotA);
  // Party entry to modify (using Member B identity)
  const partyUpdate: IShoppingMallSnapshotParty.IUpdate = {
    partyType: "member",
    partyId: memberB.id,
    canView: true,
  } satisfies IShoppingMallSnapshotParty.IUpdate;
  // 5) As Member B, attempt unauthorized snapshot party update -> should fail
  await TestValidator.error(
    "unauthorized member cannot update snapshot parties",
    async () => {
      await api.functional.shoppingMall.member.snapshots.parties.updateSnapshotParties(
        memberBConnection,
        {
          snapshotId: snapshotA.id,
          body: partyUpdate,
        },
      );
    },
  );
  // 6) As Member A, update snapshot parties successfully
  const updateSummary =
    await api.functional.shoppingMall.member.snapshots.parties.updateSnapshotParties(
      memberAConnection,
      {
        snapshotId: snapshotA.id,
        body: partyUpdate,
      },
    );
  typia.assert(updateSummary);
  TestValidator.equals(
    "snapshotId in response matches",
    updateSummary.shopping_mall_snapshot_id,
    snapshotA.id,
  );
  TestValidator.equals(
    "can_view in response matches",
    updateSummary.can_view,
    partyUpdate.canView,
  );
}
