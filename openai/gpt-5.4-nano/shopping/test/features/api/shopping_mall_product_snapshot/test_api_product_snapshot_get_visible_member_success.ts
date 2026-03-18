import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import type { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import type { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_admin_snapshots_create } from "../../../generate/generate_random_shopping_mall_admin_snapshots_create";
import { generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party } from "../../../generate/generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party";
import { prepare_random_shopping_mall_snapshot } from "../../../prepare/prepare_random_shopping_mall_snapshot";
import { prepare_random_shopping_mall_snapshot_party } from "../../../prepare/prepare_random_shopping_mall_snapshot_party";

export async function test_api_product_snapshot_get_visible_member_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Scenario 1: visible to member
  const visibleSnapshot =
    await generate_random_shopping_mall_admin_snapshots_create(
      adminConnection,
      {},
    );
  await generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party(
    adminConnection,
    {
      params: { snapshotId: visibleSnapshot.id },
      body: {
        partyType: "member",
        partyId: memberAuth.id,
        canView: true,
      } satisfies IShoppingMallSnapshotParty.ICreate,
    },
  );
  const visibleFirst =
    await api.functional.shoppingMall.member.productSnapshots.at(
      memberConnection,
      {
        productSnapshotId: visibleSnapshot.id,
      },
    );
  typia.assert(visibleFirst);
  const visibleSecond =
    await api.functional.shoppingMall.member.productSnapshots.at(
      memberConnection,
      {
        productSnapshotId: visibleSnapshot.id,
      },
    );
  typia.assert(visibleSecond);
  TestValidator.equals(
    "snapshot_code stable",
    visibleSecond.snapshot_code,
    visibleFirst.snapshot_code,
  );
  TestValidator.equals(
    "snapshot_name stable",
    visibleSecond.snapshot_name,
    visibleFirst.snapshot_name,
  );
  TestValidator.equals(
    "snapshot_description stable",
    visibleSecond.snapshot_description,
    visibleFirst.snapshot_description,
  );
  TestValidator.equals(
    "snapshot_category_id stable",
    visibleSecond.snapshot_category_id,
    visibleFirst.snapshot_category_id,
  );
  TestValidator.equals(
    "snapshot_seller_id stable",
    visibleSecond.snapshot_seller_id,
    visibleFirst.snapshot_seller_id,
  );
  TestValidator.equals(
    "display_price stable",
    visibleSecond.display_price,
    visibleFirst.display_price,
  );
  TestValidator.equals(
    "is_listed stable",
    visibleSecond.is_listed,
    visibleFirst.is_listed,
  );
  TestValidator.equals(
    "shopping_mall_product_id stable",
    visibleSecond.shopping_mall_product_id,
    visibleFirst.shopping_mall_product_id,
  );
  // Scenario 2/3: not visible to member but admin can view
  const nonVisibleSnapshot =
    await generate_random_shopping_mall_admin_snapshots_create(
      adminConnection,
      {},
    );
  await generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party(
    adminConnection,
    {
      params: { snapshotId: nonVisibleSnapshot.id },
      body: {
        partyType: "member",
        partyId: memberAuth.id,
        canView: false,
      } satisfies IShoppingMallSnapshotParty.ICreate,
    },
  );
  await generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party(
    adminConnection,
    {
      params: { snapshotId: nonVisibleSnapshot.id },
      body: {
        partyType: "admin",
        partyId: adminAuth.id,
        canView: true,
      } satisfies IShoppingMallSnapshotParty.ICreate,
    },
  );
  await TestValidator.error(
    "member cannot view non-visible snapshot",
    async () => {
      await api.functional.shoppingMall.member.productSnapshots.at(
        memberConnection,
        { productSnapshotId: nonVisibleSnapshot.id },
      );
    },
  );
  const adminVisible =
    await api.functional.shoppingMall.member.productSnapshots.at(
      adminConnection,
      { productSnapshotId: nonVisibleSnapshot.id },
    );
  typia.assert(adminVisible);
  // Scenario 3 repeat denial without existence leakage assertions
  await TestValidator.error(
    "member denied again for the same non-visible snapshot",
    async () => {
      await api.functional.shoppingMall.member.productSnapshots.at(
        memberConnection,
        { productSnapshotId: nonVisibleSnapshot.id },
      );
    },
  );
}
