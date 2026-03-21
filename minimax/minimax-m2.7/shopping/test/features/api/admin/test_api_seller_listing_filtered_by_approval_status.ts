import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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

export async function test_api_seller_listing_filtered_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create test sellers (all will have 'pending' approval status)
  const sellerConnection1: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(sellerConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller1);
  const sellerConnection2: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(sellerConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller2);
  const sellerConnection3: api.IConnection = { host: connection.host };
  const seller3 = await authorize_seller_join(sellerConnection3, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller3);
  // 3. Retrieve all sellers to get total count
  const allSellersResponse =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {} satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(allSellersResponse);
  TestValidator.equals(
    "has pagination",
    true,
    allSellersResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "has data array",
    true,
    Array.isArray(allSellersResponse.data),
  );
  // 4. Filter sellers by 'pending' approval status
  const pendingSellersResponse =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        approval_status: "pending",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(pendingSellersResponse);
  // Validate response structure
  TestValidator.equals(
    "has pagination",
    true,
    pendingSellersResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination current is 1",
    pendingSellersResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "has data array",
    true,
    Array.isArray(pendingSellersResponse.data),
  );
  // All returned sellers should have 'pending' approval status
  for (const seller of pendingSellersResponse.data) {
    TestValidator.equals(
      "approval_status is pending",
      seller.approval_status,
      "pending",
    );
    // Verify seller summary structure
    TestValidator.equals("has id", true, seller.id !== undefined);
    TestValidator.equals("has email", true, seller.email !== undefined);
    TestValidator.equals(
      "has approval_status",
      true,
      seller.approval_status !== undefined,
    );
    TestValidator.equals(
      "has created_at",
      true,
      seller.created_at !== undefined,
    );
    // Verify nested profile information
    TestValidator.equals("has profile", true, seller.profile !== undefined);
    TestValidator.equals(
      "profile has name",
      true,
      seller.profile.name !== undefined,
    );
    TestValidator.equals(
      "profile has logo_uri",
      true,
      seller.profile.logo_uri !== undefined,
    );
  }
  // 5. Verify our created sellers are in the pending list
  const pendingSellerIds = pendingSellersResponse.data.map((s) => s.id);
  TestValidator.predicate(
    "created seller 1 is pending",
    pendingSellerIds.includes(seller1.id),
  );
  TestValidator.predicate(
    "created seller 2 is pending",
    pendingSellerIds.includes(seller2.id),
  );
  TestValidator.predicate(
    "created seller 3 is pending",
    pendingSellerIds.includes(seller3.id),
  );
  // 6. Filter by non-existent status (should return empty data)
  const emptyResponse = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "nonexistent_status",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty result has no data",
    0,
    emptyResponse.data.length,
  );
  TestValidator.equals(
    "empty result records is 0",
    0,
    emptyResponse.pagination.records,
  );
}
