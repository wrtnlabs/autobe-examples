import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShopProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_admin_profile_snapshots_dispute_resolution(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin login with super admin privileges
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create seller with initial profile (generates first snapshot)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `seller${RandomGenerator.alphabets(6)}@test.com`,
      password: "1234",
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Admin retrieves seller profile snapshots
  const snapshots =
    await api.functional.ecommerceMall.admin.profile.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          seller_id: seller.id,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Verify snapshots exist and contain expected data
  TestValidator.equals("snapshots exist", snapshots.data.length > 0, true);
  TestValidator.predicate(
    "snapshots have timestamps",
    snapshots.data.every((s) => s.created_at && s.updated_at),
  );
  TestValidator.equals(
    "snapshots reference correct seller",
    snapshots.data,
    snapshots.data.filter((s) => s.ecommerce_mall_seller_id === seller.id),
  );
  // 5. Test pagination with before parameter
  if (snapshots.data.length > 0) {
    const beforeSnapshots =
      await api.functional.ecommerceMall.admin.profile.snapshots.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 5,
            before: snapshots.data[0].created_at,
            seller_id: seller.id,
          } satisfies IEcommerceMallShopProfile.IRequest,
        },
      );
    typia.assert(beforeSnapshots);
  }
  // 6. Test pagination with after parameter
  if (snapshots.data.length > 1) {
    const afterSnapshots =
      await api.functional.ecommerceMall.admin.profile.snapshots.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 5,
            after: snapshots.data[snapshots.data.length - 1].created_at,
            seller_id: seller.id,
          } satisfies IEcommerceMallShopProfile.IRequest,
        },
      );
    typia.assert(afterSnapshots);
  }
  // 7. Verify snapshot contains reference to shop profile
  TestValidator.predicate(
    "snapshots contain shop profile reference",
    snapshots.data.every((s) => s.ecommerce_mall_shop_profile_id !== null),
  );
}
