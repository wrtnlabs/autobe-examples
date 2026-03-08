import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSnapshot";
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

export async function test_api_seller_profile_snapshot_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create seller account
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. Update seller profile as admin to create snapshots
  const updatedShopName = RandomGenerator.name();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedSeller = await api.functional.ecommerceMall.admin.sellers.update(
    adminLoginConnection,
    {
      sellerId,
      body: {
        shop_name: updatedShopName,
        shop_description: updatedDescription,
      } satisfies IEcommerceMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller);
  // 4. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.seller.email,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 5. Query snapshots endpoint
  const snapshots =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 6. Verify snapshots exist and contain expected fields
  TestValidator.predicate("snapshots exist", snapshots.data.length > 0);
  const latestSnapshot = snapshots.data[0];
  TestValidator.equals("snapshot has id", typeof latestSnapshot.id, "string");
  TestValidator.equals(
    "snapshot has created_at",
    typeof latestSnapshot.created_at,
    "string",
  );
  // Verify previous_values contains shop_name and shop_description
  TestValidator.predicate(
    "previous_values has shop_name",
    "shop_name" in latestSnapshot.previous_values,
  );
  TestValidator.predicate(
    "previous_values has shop_description",
    "shop_description" in latestSnapshot.previous_values,
  );
  // Verify current_values contains shop_name and shop_description
  TestValidator.predicate(
    "current_values has shop_name",
    "shop_name" in latestSnapshot.current_values,
  );
  TestValidator.predicate(
    "current_values has shop_description",
    "shop_description" in latestSnapshot.current_values,
  );
  // Verify the current_values match the updated profile
  TestValidator.equals(
    "current shop_name matches update",
    latestSnapshot.current_values.shop_name,
    updatedShopName,
  );
  TestValidator.equals(
    "current shop_description matches update",
    latestSnapshot.current_values.shop_description,
    updatedDescription,
  );
}