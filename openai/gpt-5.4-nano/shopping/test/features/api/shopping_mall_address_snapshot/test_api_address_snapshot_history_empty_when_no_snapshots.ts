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

export async function test_api_address_snapshot_history_empty_when_no_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authorize as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Create an address (no snapshots should exist yet)
  const address: IShoppingMallAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {},
    );
  typia.assert(address);
  // 3) First PATCH request for snapshot history
  const pageRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAddressSnapshot.IRequest;
  const firstResult: IPageIShoppingMallAddressSnapshot.ISummary =
    await api.functional.shoppingMall.member.addresses.snapshots.index(
      memberConnection,
      {
        addressId: address.id,
        body: pageRequest,
      },
    );
  typia.assert(firstResult);
  TestValidator.equals("snapshot history data is empty", firstResult.data, []);
  TestValidator.equals(
    "snapshot history records is 0",
    firstResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "snapshot history pages is 0",
    firstResult.pagination.pages,
    0,
  );
  // 4) Re-run PATCH request to ensure it is read-only
  const secondResult: IPageIShoppingMallAddressSnapshot.ISummary =
    await api.functional.shoppingMall.member.addresses.snapshots.index(
      memberConnection,
      {
        addressId: address.id,
        body: pageRequest,
      },
    );
  typia.assert(secondResult);
  TestValidator.equals(
    "snapshot history data remains empty",
    secondResult.data,
    [],
  );
  TestValidator.equals(
    "snapshot history records remains 0",
    secondResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "snapshot history pages remains 0",
    secondResult.pagination.pages,
    0,
  );
}
