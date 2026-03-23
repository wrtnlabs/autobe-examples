import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test seller account listing with pagination functionality.
 *
 * This test validates the primary success path for retrieving seller accounts
 * with pagination support. It authenticates as an administrator, retrieves
 * seller listings with default pagination parameters, and validates the
 * response structure and pagination metadata.
 */
export async function test_api_seller_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Request seller list with default pagination (page=1, limit=20)
  const page1Response = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(page1Response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", page1Response.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    page1Response.pagination.pages >= 0,
  );
  // 4. Validate seller summary data structure
  await ArrayUtil.asyncForEach(page1Response.data, async (seller) => {
    typia.assert(seller);
    // Verify required fields exist
    TestValidator.predicate(
      "seller has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        seller.id,
      ),
    );
    TestValidator.predicate(
      "seller has valid email",
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
        seller.email,
      ),
    );
    TestValidator.predicate(
      "seller has shop name",
      seller.shop_name.length > 0,
    );
    TestValidator.predicate(
      "seller has valid approval_status",
      ["pending", "approved", "rejected", "suspended"].includes(
        seller.approval_status,
      ),
    );
    TestValidator.predicate(
      "seller has valid status",
      ["active", "banned"].includes(seller.status),
    );
    TestValidator.predicate(
      "seller has valid created_at",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
        seller.created_at,
      ),
    );
    TestValidator.predicate(
      "seller has valid updated_at",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
        seller.updated_at,
      ),
    );
  });
  // 5. Test pagination by requesting page 2
  const page2Response = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(page2Response);
  // 6. Validate page 2 pagination metadata
  TestValidator.equals(
    "page 2 current is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit is 20",
    page2Response.pagination.limit,
    20,
  );
  // 7. Verify page 2 has different results or empty if no more sellers
  if (page1Response.data.length > 0) {
    const page1Ids = new Set(page1Response.data.map((s) => s.id));
    const page2Ids = new Set(page2Response.data.map((s) => s.id));
    // Check that page 2 sellers are different from page 1 (no overlap)
    const hasOverlap = Array.from(page2Ids).some((id) => page1Ids.has(id));
    TestValidator.predicate(
      "page 2 has no overlapping sellers with page 1",
      !hasOverlap,
    );
  }
}
