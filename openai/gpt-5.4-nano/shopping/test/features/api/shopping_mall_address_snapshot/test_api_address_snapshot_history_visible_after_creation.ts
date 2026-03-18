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

export async function test_api_address_snapshot_history_visible_after_creation(
  connection: api.IConnection,
): Promise<void> {
  // Actor: member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const address: IShoppingMallAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {},
    );
  typia.assert(address);
  const createdSnapshot: IShoppingMallAddressSnapshot =
    await api.functional.shoppingMall.member.addresses.snapshots.createAddressSnapshot(
      memberConnection,
      {
        addressId: address.id,
      },
    );
  typia.assert(createdSnapshot);
  const before: IPageIShoppingMallAddressSnapshot.ISummary =
    await api.functional.shoppingMall.member.addresses.snapshots.index(
      memberConnection,
      {
        addressId: address.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(before);
  const response: IPageIShoppingMallAddressSnapshot.ISummary =
    await api.functional.shoppingMall.member.addresses.snapshots.index(
      memberConnection,
      {
        addressId: address.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(response);
  const { current, limit, records, pages } = response.pagination;
  TestValidator.predicate("current non-negative", current >= 0);
  TestValidator.predicate("limit non-negative", limit >= 0);
  TestValidator.predicate("records non-negative", records >= 0);
  const expectedPages =
    limit === 0 || records === 0 ? 0 : Math.ceil(records / limit);
  TestValidator.equals(
    "pages matches ceil(records/limit)",
    pages,
    expectedPages,
  );
  TestValidator.predicate(
    "includes created snapshot",
    response.data.some((x) => x.id === createdSnapshot.id),
  );
  const after: IPageIShoppingMallAddressSnapshot.ISummary =
    await api.functional.shoppingMall.member.addresses.snapshots.index(
      memberConnection,
      {
        addressId: address.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(after);
  TestValidator.equals(
    "read-only pagination current",
    after.pagination.current,
    response.pagination.current,
  );
  TestValidator.equals(
    "read-only pagination limit",
    after.pagination.limit,
    response.pagination.limit,
  );
  TestValidator.equals(
    "read-only pagination records",
    after.pagination.records,
    response.pagination.records,
  );
  TestValidator.equals(
    "read-only pagination pages",
    after.pagination.pages,
    response.pagination.pages,
  );
  TestValidator.predicate(
    "snapshot still visible after PATCH",
    after.data.some((x) => x.id === createdSnapshot.id),
  );
  TestValidator.equals(
    "no new records created (before vs after)",
    before.pagination.records,
    after.pagination.records,
  );
}
