import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_seller_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  const originalShopName = sellerAuth.shop_name;
  const originalDescription = sellerAuth.shop_description;
  const originalUpdatedAt = sellerAuth.updated_at;
  // 3. Approve seller account
  const approvedSeller =
    await api.functional.ecommerceMall.admin.sellers.approve(adminConnection, {
      sellerId,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "approval status",
    approvedSeller.approval_status,
    "approved",
  );
  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Update seller profile
  const newShopName = RandomGenerator.name();
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedSeller = await api.functional.ecommerceMall.admin.sellers.update(
    adminConnection,
    {
      sellerId,
      body: {
        shop_name: newShopName,
        shop_description: newDescription,
      } satisfies IEcommerceMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller);
  // 5. Verify updated profile information
  TestValidator.equals(
    "shop name updated",
    updatedSeller.shop_name,
    newShopName,
  );
  TestValidator.equals(
    "shop description updated",
    updatedSeller.shop_description,
    newDescription,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedSeller.updated_at,
    originalUpdatedAt,
  );
  TestValidator.notEquals(
    "shop name differs from original",
    updatedSeller.shop_name,
    originalShopName,
  );
  TestValidator.notEquals(
    "shop description differs from original",
    updatedSeller.shop_description,
    originalDescription,
  );
}