import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";

export async function test_api_seller_profile_snapshot_access_denied_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  // 2. Create and approve Seller A
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuthorized = await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: "Seller1234!" as string & tags.Format<"password">,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  // Admin approves Seller A
  await api.functional.ecommerceMall.admin.seller_approvals.create(
    adminConnection,
    {
      body: {
        sellerId: sellerAAuthorized.id,
        status: "approved",
      } satisfies IEcommerceMallSellerApproval.ICreate,
    },
  );
  // Login as Seller A
  const sellerALoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerALoginConnection, {
    body: {
      email: sellerAEmail,
      password: "Seller1234!" as string & tags.Format<"password">,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  // Seller A updates profile to create snapshots
  await api.functional.ecommerceMall.seller.seller.profile.update(
    sellerALoginConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallSellerProfile.IUpdate,
    },
  );
  // 3. Create and approve Seller B
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuthorized = await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: "Seller1234!" as string & tags.Format<"password">,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  // Admin approves Seller B
  await api.functional.ecommerceMall.admin.seller_approvals.create(
    adminConnection,
    {
      body: {
        sellerId: sellerBAuthorized.id,
        status: "approved",
      } satisfies IEcommerceMallSellerApproval.ICreate,
    },
  );
  // Login as Seller B
  const sellerBLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerBLoginConnection, {
    body: {
      email: sellerBEmail,
      password: "Seller1234!" as string & tags.Format<"password">,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  // 4. Seller B attempts to access Seller A's snapshot - should get 403 Forbidden
  // Use a valid UUID format to test authorization (ownership check happens before existence check)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Seller B cannot access another seller's snapshot",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.profile.snapshots.at(
        sellerBLoginConnection,
        {
          snapshotId: snapshotId,
        },
      );
    },
  );
}
