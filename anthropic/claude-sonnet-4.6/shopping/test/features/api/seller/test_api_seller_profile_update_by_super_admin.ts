import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_profile_update_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register a new seller to act as the update target
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  const sellerId = sellerAuthorized.id;
  // 3. Primary success path: Update seller profile with full body
  const updateBody = {
    shopName: "Updated Seller Shop",
    shopDescription: "A great shop for electronics",
    logoUrl: "https://example.com/logo.png" as string &
      tags.MaxLength<80000> &
      tags.Format<"uri">,
  } satisfies IShoppingMallSeller.IUpdate;
  const updatedSeller =
    await api.functional.shoppingMall.superAdmin.sellers.update(
      superAdminConnection,
      {
        sellerId: sellerId,
        body: updateBody,
      },
    );
  typia.assert(updatedSeller);
  // Validate business logic fields
  TestValidator.equals("seller id matches", updatedSeller.id, sellerId);
  TestValidator.equals(
    "shopName updated",
    updatedSeller.shopName,
    "Updated Seller Shop",
  );
  TestValidator.equals("isBanned is false", updatedSeller.isBanned, false);
  TestValidator.equals(
    "isSuspended is false",
    updatedSeller.isSuspended,
    false,
  );
  TestValidator.equals("deletedAt is null", updatedSeller.deletedAt, null);
  // 4. Edge case: Update with only required shopName
  const minimalUpdateBody = {
    shopName: "Minimal Shop Name",
  } satisfies IShoppingMallSeller.IUpdate;
  const minimalUpdatedSeller =
    await api.functional.shoppingMall.superAdmin.sellers.update(
      superAdminConnection,
      {
        sellerId: sellerId,
        body: minimalUpdateBody,
      },
    );
  typia.assert(minimalUpdatedSeller);
  // Validate the minimal update
  TestValidator.equals(
    "minimal shopName updated",
    minimalUpdatedSeller.shopName,
    "Minimal Shop Name",
  );
  TestValidator.equals(
    "isBanned still false after minimal update",
    minimalUpdatedSeller.isBanned,
    false,
  );
  TestValidator.equals(
    "isSuspended still false after minimal update",
    minimalUpdatedSeller.isSuspended,
    false,
  );
}
