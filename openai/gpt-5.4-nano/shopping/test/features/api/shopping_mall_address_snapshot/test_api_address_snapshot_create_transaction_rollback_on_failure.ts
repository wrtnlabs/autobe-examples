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

export async function test_api_address_snapshot_create_transaction_rollback_on_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IShoppingMallMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "pass_1234_rollback",
      } satisfies IShoppingMallMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2) Create a member-owned shipping address
  const addressBody = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    postal_code: RandomGenerator.alphabets(6),
    country: "Korea",
    city: RandomGenerator.alphabets(6),
    street_line1: RandomGenerator.alphabets(10),
    street_line2: null,
    is_default: true,
  } satisfies IShoppingMallAddress.ICreate;
  const createdAddress: IShoppingMallAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      { body: addressBody },
    );
  typia.assert(createdAddress);
  const addressId: string & tags.Format<"uuid"> = createdAddress.id;
  // baseline snapshot count
  const baselinePage: IPageIShoppingMallAddressSnapshot.ISummary =
    await api.functional.shoppingMall.member.addresses.snapshots.index(
      memberConnection,
      {
        addressId,
        body: {
          page: 1,
          limit: 50,
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(baselinePage);
  const baselineCount: number = baselinePage.data.length;
  // 3) Trigger snapshot creation failure by racing delete + snapshot create
  const snapshotCreatePromise =
    api.functional.shoppingMall.member.addresses.snapshots.createAddressSnapshot(
      memberConnection,
      {
        addressId,
      },
    );
  const deletePromise = api.functional.shoppingMall.member.addresses.erase(
    memberConnection,
    {
      addressId,
    },
  );
  await TestValidator.error(
    "snapshot creation should fail and not persist partial data",
    async () => {
      await snapshotCreatePromise;
    },
  );
  await deletePromise;
  // 4) Validate rollback: snapshot list unchanged (no new snapshot rows)
  const afterFailurePage: IPageIShoppingMallAddressSnapshot.ISummary =
    await api.functional.shoppingMall.member.addresses.snapshots.index(
      memberConnection,
      {
        addressId,
        body: {
          page: 1,
          limit: 50,
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(afterFailurePage);
  TestValidator.equals(
    "snapshot count unchanged after failed snapshot creation",
    afterFailurePage.data.length,
    baselineCount,
  );
  // 5) Create a fresh snapshot afterwards (system returns to stable state)
  //    Need a valid address: create a new address, then snapshot it.
  const freshAddress: IShoppingMallAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          postal_code: RandomGenerator.alphabets(6),
          country: "Korea",
          city: RandomGenerator.alphabets(6),
          street_line1: RandomGenerator.alphabets(10),
          street_line2: null,
          is_default: true,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(freshAddress);
  const freshSnapshot: IShoppingMallAddressSnapshot =
    await api.functional.shoppingMall.member.addresses.snapshots.createAddressSnapshot(
      memberConnection,
      {
        addressId: freshAddress.id,
      },
    );
  typia.assert(freshSnapshot);
  TestValidator.equals(
    "snapshot references fresh address",
    freshSnapshot.shoppingMallAddressId,
    freshAddress.id,
  );
}
