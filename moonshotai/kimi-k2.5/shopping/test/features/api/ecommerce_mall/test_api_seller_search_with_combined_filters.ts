import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
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

export async function test_api_seller_search_with_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://admin.test.com/login",
      referrer: "https://admin.test.com/",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Define date range for test (last 30 days inclusive)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // 2. Create test seller accounts with different patterns
  // Seller A: email contains 'test' (should be included)
  const sellerAConn: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConn, {
    body: {
      email: `test-${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://seller.test.com/join",
      referrer: "https://seller.test.com/",
      ip: "192.168.1.1",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // Seller B: email contains 'test' (should be included)
  const sellerBConn: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConn, {
    body: {
      email: `test-${typia.random<string & tags.Format<"uuid">>()}@test-mall.com`,
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://seller.test.com/join",
      referrer: "https://seller.test.com/",
      ip: "192.168.1.2",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // Seller C: email does NOT contain 'test' (should be excluded by email filter)
  const sellerCConn: api.IConnection = { host: connection.host };
  const sellerC = await authorize_seller_join(sellerCConn, {
    body: {
      email: `other-${typia.random<string & tags.Format<"uuid">>()}@example.com`,
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://seller.test.com/join",
      referrer: "https://seller.test.com/",
      ip: "192.168.1.3",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerC);
  // 3. Search with combined filters - note: using 'pending' status as new sellers start as pending
  const response = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        approvalStatus: "pending",
        createdAtFrom: thirtyDaysAgo.toISOString(),
        createdAtTo: now.toISOString(),
        email: "test",
        pageSize: 100,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(response);
  // 4. Verify all returned sellers have email containing 'test' (AND logic verification)
  const sellerIdsWithTest = [sellerA.id, sellerB.id];
  for (const seller of response.data) {
    // Verify approvalStatus matches filter
    if (seller.approvalStatus !== "pending") {
      throw new Error(
        `Seller ${seller.id} has approvalStatus=${seller.approvalStatus}, expected pending`,
      );
    }
    // Verify email contains 'test'
    if (!seller.email.toLowerCase().includes("test")) {
      throw new Error(
        `Seller ${seller.id} email ${seller.email} does not contain 'test'`,
      );
    }
    // Verify createdAt within range
    const createdAt = new Date(seller.createdAt);
    if (createdAt < thirtyDaysAgo || createdAt > now) {
      throw new Error(
        `Seller ${seller.id} createdAt ${seller.createdAt} is outside the date range`,
      );
    }
  }
  // 5. Verify seller C (without 'test' in email) is excluded
  const foundSellerC = response.data.find((s) => s.id === sellerC.id);
  if (foundSellerC !== undefined) {
    throw new Error(
      "Seller without 'test' in email should be excluded from results",
    );
  }
  // 6. Verify sellers with 'test' in email are included (if date filter doesn't exclude them)
  // Since all were just created, they should all be within date range
  const foundSellerA = response.data.find((s) => s.id === sellerA.id);
  const foundSellerB = response.data.find((s) => s.id === sellerB.id);
  if (foundSellerA === undefined) {
    throw new Error("Seller A with 'test' in email should be included");
  }
  if (foundSellerB === undefined) {
    throw new Error("Seller B with 'test' in email should be included");
  }
}
