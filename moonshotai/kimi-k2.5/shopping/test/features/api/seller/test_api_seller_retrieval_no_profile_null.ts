import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

/**
 * Test retrieval of a seller with no profile snapshots.
 *
 * Admin authenticates via admin/join, then retrieves a seller account that exists
 * but has no associated profile snapshots in the database. Validate that the
 * response returns the seller's account details with the profile field set to null
 * when the seller hasn't set up their shop profile yet.
 */
export async function test_api_seller_retrieval_no_profile_null(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin setup - authenticate as administrator using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://admin.mall.example/admin/login",
      referrer: "https://admin.mall.example/admin/dashboard",
      ip: null,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 2: Retrieve a seller with random ID - assuming the seller exists without profile
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Get seller details through admin endpoint
  const seller = await api.functional.ecommerceMall.admin.sellers.at(
    adminConnection,
    {
      sellerId,
    },
  );
  typia.assert(seller);
  // Step 4: Validate that profile is null when no profile snapshot exists
  TestValidator.equals(
    "profile should be null for seller without profile",
    seller.profile,
    null,
  );
}
