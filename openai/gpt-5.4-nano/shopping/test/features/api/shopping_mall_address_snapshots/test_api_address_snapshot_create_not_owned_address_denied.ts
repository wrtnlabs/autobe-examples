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

export async function test_api_address_snapshot_create_not_owned_address_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins and creates an address
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  void memberA;
  const memberAAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberAConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          postal_code: randint(10000, 99999).toString(),
          country: RandomGenerator.pick(["Korea", "USA", "Japan", "Germany"]),
          city: RandomGenerator.pick(["Seoul", "Busan", "Incheon", "Osaka"]),
          street_line1: RandomGenerator.alphabets(10),
          street_line2: null,
          is_default: true,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(memberAAddress);
  const addressId_A = memberAAddress.id;
  // Snapshot count visible to member A for this address before B attempts denial
  const memberAInitialPage =
    await api.functional.shoppingMall.member.addresses.snapshots.index(
      memberAConnection,
      {
        addressId: addressId_A,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(memberAInitialPage);
  const initialCountForA = memberAInitialPage.data.length;
  // 2) Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  void memberB;
  // Snapshot count visible to member B for this address before denial
  const memberBInitialPage =
    await api.functional.shoppingMall.member.addresses.snapshots.index(
      memberBConnection,
      {
        addressId: addressId_A,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(memberBInitialPage);
  const initialCountForB = memberBInitialPage.data.length;
  // 3) As member B, try to create snapshot for address owned by A
  await TestValidator.error(
    "should deny snapshot creation for not-owned address",
    async () => {
      await api.functional.shoppingMall.member.addresses.snapshots.createAddressSnapshot(
        memberBConnection,
        {
          addressId: addressId_A,
        },
      );
    },
  );
  // 4) Validate denial: B should not gain any new snapshot visibility, and A's count must remain unchanged
  const memberBAfterDeniedPage =
    await api.functional.shoppingMall.member.addresses.snapshots.index(
      memberBConnection,
      {
        addressId: addressId_A,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(memberBAfterDeniedPage);
  TestValidator.equals(
    "member B snapshot count unchanged after denied call",
    memberBAfterDeniedPage.data.length,
    initialCountForB,
  );
  const memberAAfterDeniedPage =
    await api.functional.shoppingMall.member.addresses.snapshots.index(
      memberAConnection,
      {
        addressId: addressId_A,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(memberAAfterDeniedPage);
  TestValidator.equals(
    "member A snapshot count unchanged after denied call",
    memberAAfterDeniedPage.data.length,
    initialCountForA,
  );
  // 5) Finally, member A successfully creates snapshot for addressId_A
  const createdSnapshot =
    await api.functional.shoppingMall.member.addresses.snapshots.createAddressSnapshot(
      memberAConnection,
      {
        addressId: addressId_A,
      },
    );
  typia.assert(createdSnapshot);
  TestValidator.equals(
    "snapshot references the requested address",
    createdSnapshot.shoppingMallAddressId,
    addressId_A,
  );
  const memberAFinalPage =
    await api.functional.shoppingMall.member.addresses.snapshots.index(
      memberAConnection,
      {
        addressId: addressId_A,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(memberAFinalPage);
  TestValidator.equals(
    "member A snapshot count increased by 1 after successful creation",
    memberAFinalPage.data.length,
    initialCountForA + 1,
  );
}
