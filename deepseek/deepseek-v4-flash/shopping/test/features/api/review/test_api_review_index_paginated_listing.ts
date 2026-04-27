import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an administrator can retrieve a paginated list of non-deleted reviews sorted newest first by default.
 *
 * Validates the review listing endpoint's pagination behavior, sorting order, and response structure. Since the E2E environment may not have pre-seeded review data, the test focuses on structural validation of pagination metadata and review summary fields, with sorting validation applied only when data is available.
 *
 * 1. Authenticate as administrator via `authorize_administrator_join`.
 * 2. Call PATCH /eCommerceMall/administrator/reviews with default parameters (no filters, no pagination).
 * 3. Validate response contains `pagination` with `current`, `limit`, `records`, `pages`.
 * 4. Test explicit pagination: call with `page=1` and `limit=2`, verify `pagination.current === 1` and `data.length <= 2`.
 * 5. If total records > limit, fetch page 2 and verify `pagination.current === 2`.
 * 6. Validate sorting: if multiple reviews returned, verify `created_at` is descending (newest first).
 */
export async function test_api_review_index_paginated_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Call with default parameters (no filters)
  const defaultPage =
    await api.functional.eCommerceMall.administrator.reviews.index(
      adminConnection,
      {
        body: {} satisfies IECommerceMallReview.IRequest,
      },
    );
  typia.assert(defaultPage);
  // 3. Test pagination: page=1, limit=2
  const paged = await api.functional.eCommerceMall.administrator.reviews.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IECommerceMallReview.IRequest,
    },
  );
  typia.assert(paged);
  TestValidator.equals("pagination.current is 1", paged.pagination.current, 1);
  TestValidator.equals("pagination.limit is 2", paged.pagination.limit, 2);
  TestValidator.predicate("data.length <= 2", paged.data.length <= 2);
  // 4. If there are more records than the limit, page 2 should exist
  if (paged.pagination.records > 2) {
    const page2 =
      await api.functional.eCommerceMall.administrator.reviews.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 2,
          } satisfies IECommerceMallReview.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals(
      "page 2 pagination.current is 2",
      page2.pagination.current,
      2,
    );
  }
  // 5. Validate sort order: newest first (created_at descending)
  if (paged.data.length > 1) {
    for (let i = 1; i < paged.data.length; i++) {
      TestValidator.predicate(
        `review[${i - 1}] created_at >= review[${i}] created_at`,
        paged.data[i - 1].created_at >= paged.data[i].created_at,
      );
    }
  }
}
