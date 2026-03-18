import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_product_variant_snapshot_index_search_by_code_name_variant_id(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authorization (use join as specified)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2) Fetch initial snapshots to pick a stable sample
  const initial =
    await api.functional.shoppingMall.admin.productVariantSnapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(initial);
  TestValidator.predicate(
    "should return at least 1 snapshot for sampling",
    () => initial.data.length > 0,
  );
  const picked = initial.data[0];
  typia.assert(picked);
  const productVariantId = picked.productVariant.id;
  const code = picked.code;
  const name = picked.name;
  // 3) Exact match by productVariantId + code + name
  const exact =
    await api.functional.shoppingMall.admin.productVariantSnapshots.index(
      adminConnection,
      {
        body: {
          productVariantId,
          code,
          name,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(exact);
  TestValidator.predicate(
    "should include the picked snapshot id in exact-match results",
    () => exact.data.some((x) => x.id === picked.id),
  );
  // If server returns only one record for this exact combination, ensure length === 1
  // (Otherwise, just validate subset correctness already covered by inclusion check)
  if (exact.data.length === 1) {
    TestValidator.equals(
      "single exact-match record should be the picked one",
      exact.data[0].id,
      picked.id,
    );
  }
  // 5) Pagination determinism across pages using broader filter (productVariantId only)
  const broader =
    await api.functional.shoppingMall.admin.productVariantSnapshots.index(
      adminConnection,
      {
        body: {
          productVariantId,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(broader);
  if (broader.pagination.pages > 1) {
    const page1 =
      await api.functional.shoppingMall.admin.productVariantSnapshots.index(
        adminConnection,
        {
          body: {
            productVariantId,
            page: 1,
            limit: 10,
          } satisfies IShoppingMallProductVariantSnapshot.IRequest,
        },
      );
    typia.assert(page1);
    const page2 =
      await api.functional.shoppingMall.admin.productVariantSnapshots.index(
        adminConnection,
        {
          body: {
            productVariantId,
            page: 2,
            limit: 10,
          } satisfies IShoppingMallProductVariantSnapshot.IRequest,
        },
      );
    typia.assert(page2);
    const ids1 = page1.data.map((x) => x.id);
    const ids2 = page2.data.map((x) => x.id);
    const seen = new Set<string>();
    ids1.forEach((id) => seen.add(id));
    TestValidator.predicate(
      "no duplicate snapshot ids between page 1 and page 2",
      () => ids2.every((id) => !seen.has(id)),
    );
    // Ordering determinism: created_at DESC then id DESC.
    // Since backend comparator is deterministic, we validate the boundary between pages.
    const last1 = page1.data.at(-1);
    const first2 = page2.data[0];
    if (last1 && first2) {
      const aCreated = last1.created_at;
      const bCreated = first2.created_at;
      TestValidator.predicate(
        "created_at should be non-increasing from page1 last to page2 first",
        () => aCreated >= bCreated,
      );
      if (aCreated === bCreated) {
        // UUIDs are strings; we compare lexicographically as a proxy for "id DESC" boundary.
        TestValidator.predicate(
          "id should not increase when created_at ties across page boundary",
          () => last1.id >= first2.id,
        );
      }
    }
  }
}
