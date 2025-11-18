import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartMergeEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartMergeEvent";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

export async function test_api_admin_cart_merge_events_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register an admin via POST /auth/admin/join (implicit authentication)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Call PATCH /shoppingMall/admin/carts/mergeEvents with only pagination fields
  const page1 = 1 satisfies number;
  const limit = 10 satisfies number;

  const requestPage1 = {
    page: page1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limit as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies IShoppingMallCartMergeEvent.IRequest;

  const resultPage1: IPageIShoppingMallCartMergeEvent.ISummary =
    await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
      connection,
      {
        body: requestPage1,
      },
    );
  typia.assert<IPageIShoppingMallCartMergeEvent.ISummary>(resultPage1);

  const pagination1 = resultPage1.pagination;
  const data1 = resultPage1.data;

  // 3. Assert pagination invariants for page 1
  TestValidator.equals(
    "page 1: current page should equal requested page",
    pagination1.current,
    page1,
  );
  TestValidator.equals(
    "page 1: limit should equal requested limit",
    pagination1.limit,
    limit,
  );
  TestValidator.predicate(
    "page 1: records must be >= number of returned items",
    pagination1.records >= (data1?.length ?? 0),
  );

  if (pagination1.records === 0) {
    TestValidator.equals(
      "page 1: when no records, pages should be 0",
      pagination1.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "page 1: when there are records, pages must be >= 1",
      pagination1.pages >= 1,
    );
  }

  // 4. Verify created_at is monotonically non-increasing on page 1 when there are at least 2 items
  if (data1.length >= 2) {
    for (let i = 1; i < data1.length; i++) {
      const prev = data1[i - 1];
      const curr = data1[i];

      const prevTime = new Date(prev.created_at).getTime();
      const currTime = new Date(curr.created_at).getTime();

      TestValidator.predicate(
        `page 1: created_at[${i}] must be <= created_at[${i - 1}]`,
        currTime <= prevTime,
      );
    }
  }

  // 5. Optionally, request a second page and validate it when meaningful
  const page2 = 2 satisfies number;
  const requestPage2 = {
    page: page2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limit as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies IShoppingMallCartMergeEvent.IRequest;

  const resultPage2: IPageIShoppingMallCartMergeEvent.ISummary =
    await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
      connection,
      {
        body: requestPage2,
      },
    );
  typia.assert<IPageIShoppingMallCartMergeEvent.ISummary>(resultPage2);

  const pagination2 = resultPage2.pagination;
  const data2 = resultPage2.data;

  TestValidator.equals(
    "page 2: current page should equal requested page",
    pagination2.current,
    page2,
  );
  TestValidator.equals(
    "page 2: limit should equal requested limit",
    pagination2.limit,
    limit,
  );
  TestValidator.predicate(
    "page 2: records must be >= number of returned items",
    pagination2.records >= (data2?.length ?? 0),
  );

  if (pagination2.records === 0) {
    TestValidator.equals(
      "page 2: when no records, pages should be 0",
      pagination2.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "page 2: when there are records, pages must be >= 1",
      pagination2.pages >= 1,
    );
  }

  // 6. If both pages have at least one item and total pages >= 2, ensure their id sequences differ
  if (pagination1.pages >= 2 && data1.length > 0 && data2.length > 0) {
    const ids1 = data1.map((e) => e.id);
    const ids2 = data2.map((e) => e.id);

    // If records are enough to fill at least 2 full pages, expect different sequences
    if (pagination1.records > limit) {
      TestValidator.notEquals(
        "page 1 and page 2 should not have identical id sequences when enough records exist",
        ids1,
        ids2,
      );
    }
  }
}
