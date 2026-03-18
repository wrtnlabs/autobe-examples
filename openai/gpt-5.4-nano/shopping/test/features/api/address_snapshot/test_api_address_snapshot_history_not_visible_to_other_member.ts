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

export async function test_api_address_snapshot_history_not_visible_to_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A authorization
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAPassword = "Password123!A";
  const memberAEmail =
    `${RandomGenerator.alphabets(10)}.${RandomGenerator.alphabets(6)}@example.com` satisfies string;
  await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Member B authorization
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBPassword = "Password123!B";
  const memberBEmail =
    `${RandomGenerator.alphabets(10)}.${RandomGenerator.alphabets(6)}@example.com` satisfies string;
  await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  // 3) Member A creates an address (to generate addressId)
  const addressA: IShoppingMallAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberAConnection,
      {
        body: {
          recipient_name: `Recipient ${RandomGenerator.alphabets(6)}`,
          phone_number: RandomGenerator.mobile(),
          postal_code: `${RandomGenerator.alphabets(5)}`,
          country: "Korea",
          city: `City ${RandomGenerator.alphabets(5)}`,
          street_line1: `Street ${RandomGenerator.alphabets(5)}`,
          street_line2: null,
          is_default: true,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(addressA);
  // 4) Member A creates one snapshot for that address
  const snapshotA: IShoppingMallAddressSnapshot =
    await api.functional.shoppingMall.member.addresses.snapshots.createAddressSnapshot(
      memberAConnection,
      {
        addressId: addressA.id,
      },
    );
  typia.assert(snapshotA);
  // 5) Member B attempts to list snapshots for Member A's address
  const pageRequest: IShoppingMallAddressSnapshot.IRequest = {
    page: 1 satisfies IShoppingMallAddressSnapshot.IRequest["page"],
    limit: 10 satisfies IShoppingMallAddressSnapshot.IRequest["limit"],
  };
  const page1: IPageIShoppingMallAddressSnapshot.ISummary =
    await api.functional.shoppingMall.member.addresses.snapshots.index(
      memberBConnection,
      {
        addressId: addressA.id,
        body: pageRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page1 data should be empty", page1.data.length, 0);
  TestValidator.equals(
    "page1 pagination records should be 0",
    page1.pagination.records,
    0,
  );
  TestValidator.equals(
    "page1 pagination pages should be 0",
    page1.pagination.pages,
    0,
  );
  // 6) Repeated call should still return empty
  const page2: IPageIShoppingMallAddressSnapshot.ISummary =
    await api.functional.shoppingMall.member.addresses.snapshots.index(
      memberBConnection,
      {
        addressId: addressA.id,
        body: pageRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page2 data should be empty", page2.data.length, 0);
  TestValidator.equals(
    "page2 pagination records should be 0",
    page2.pagination.records,
    0,
  );
}
