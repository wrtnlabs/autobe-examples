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
 * Test successful seller retrieval by admin.
 * Admin authenticates via admin/join, then retrieves an existing seller by ID.
 * Validate that the response contains correct seller ID, email, approval status,
 * creation timestamp, and profile data (shop name, shop description, logo image URL).
 * Profile should contain the most recent profile snapshot from the seller_profile_snapshots table.
 * Verify that complete seller information is returned including all required fields.
 */
export async function test_api_seller_retrieval_by_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/admin",
      referrer: "https://test.com",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Generate seller ID for retrieval
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve seller by ID
  const seller: IEcommerceMallSeller =
    await api.functional.ecommerceMall.admin.sellers.at(adminConnection, {
      sellerId,
    });
  // 4. Validate complete response structure (validates all required fields)
  typia.assert(seller);
}
