import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_product_variant_snapshots_empty_search_pagination_order(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(memberAuthorized);
  // Use actor-specific connection (copy Authorization header)
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = { ...(memberConnection.headers ?? {}) };
  // 2) Page 1 request with empty filters
  const limit = 5 satisfies number;
  const page1Input = {
    page: 1,
    limit,
  } satisfies IShoppingMallProductVariantSnapshot.IRequest;
  const page1 =
    await api.functional.shoppingMall.member.productVariantSnapshots.index(
      authConnection,
      {
        body: page1Input,
      },
    );
  typia.assert(page1);
  TestValidator.equals("pagination.current page1", page1.pagination.current, 1);
  TestValidator.equals("pagination.limit page1", page1.pagination.limit, limit);
  const expectedPages1 =
    page1.pagination.records === 0
      ? 0
      : Math.ceil(page1.pagination.records / page1.pagination.limit);
  TestValidator.equals(
    "pagination.pages consistency page1",
    page1.pagination.pages,
    expectedPages1,
  );
  const page1Data = page1.data;
  // 3) Deterministic ordering: created_at DESC, then id DESC
  for (let i = 0; i < page1Data.length - 1; i++) {
    const a = page1Data[i];
    const b = page1Data[i + 1];
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    TestValidator.predicate(
      `created_at non-increasing at index ${i}`,
      aTime >= bTime,
    );
    if (aTime === bTime) {
      TestValidator.predicate(
        `tie-breaker id non-increasing at index ${i}`,
        a.id >= b.id,
      );
    }
  }
  // 4) Page 2 request
  const page2Input = {
    page: 2,
    limit,
  } satisfies IShoppingMallProductVariantSnapshot.IRequest;
  const page2 =
    await api.functional.shoppingMall.member.productVariantSnapshots.index(
      authConnection,
      {
        body: page2Input,
      },
    );
  typia.assert(page2);
  TestValidator.equals("pagination.current page2", page2.pagination.current, 2);
  TestValidator.equals("pagination.limit page2", page2.pagination.limit, limit);
  const expectedPages2 =
    page2.pagination.records === 0
      ? 0
      : Math.ceil(page2.pagination.records / page2.pagination.limit);
  TestValidator.equals(
    "pagination.pages consistency page2",
    page2.pagination.pages,
    expectedPages2,
  );
  const page2Data = page2.data;
  if (page2.pagination.records > limit) {
    TestValidator.notEquals(
      "page1 and page2 records should differ",
      page1Data.map((x) => x.id),
      page2Data.map((x) => x.id),
    );
  }
  // Boundary ordering validation between page 1 and page 2
  if (page1Data.length > 0 && page2Data.length > 0) {
    const last1 = page1Data[page1Data.length - 1];
    const first2 = page2Data[0];
    const last1Time = new Date(last1.created_at).getTime();
    const first2Time = new Date(first2.created_at).getTime();
    TestValidator.predicate(
      "boundary created_at non-increasing",
      last1Time >= first2Time,
    );
    if (last1Time === first2Time) {
      TestValidator.predicate(
        "boundary tie-breaker id non-increasing",
        last1.id >= first2.id,
      );
    }
  }
}
