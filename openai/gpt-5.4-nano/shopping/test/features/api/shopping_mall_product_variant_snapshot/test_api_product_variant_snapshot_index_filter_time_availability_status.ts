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

export async function test_api_product_variant_snapshot_index_filter_time_availability_status(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // Admin authorization
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  // Step 3: fetch a recent time window with an availability filter
  const now = new Date();
  const createdAtTo = now.toISOString();
  const createdAtFrom = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const limit = 20 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const page = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const isAvailableRequest = typia.random<boolean>();
  const firstPage =
    await api.functional.shoppingMall.admin.productVariantSnapshots.index(
      adminConnection,
      {
        body: {
          createdAtFrom: createdAtFrom as string & tags.Format<"date-time">,
          createdAtTo: createdAtTo as string & tags.Format<"date-time">,
          isAvailable: isAvailableRequest,
          page,
          limit,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  // Step 4: validate records within range and availability
  TestValidator.predicate(
    "all returned snapshots created_at within createdAtFrom..createdAtTo",
    () =>
      firstPage.data.every(
        (r) => r.created_at >= createdAtFrom && r.created_at <= createdAtTo,
      ),
  );
  TestValidator.predicate(
    "all returned snapshots match isAvailable filter",
    () => firstPage.data.every((r) => r.is_available === isAvailableRequest),
  );
  // Step 6: deterministic ordering (created_at DESC, id DESC tie-breaker)
  TestValidator.predicate("ordering by created_at desc, then id desc", () => {
    for (let i = 1; i < firstPage.data.length; i++) {
      const prev = firstPage.data[i - 1];
      const cur = firstPage.data[i];
      if (cur.created_at > prev.created_at) return false;
      if (cur.created_at === prev.created_at && cur.id > prev.id) return false;
    }
    return true;
  });
  // Pick an observed variantStatus to filter deterministically (if any record exists)
  const observedVariantStatus: string | undefined =
    firstPage.data.length > 0 ? firstPage.data[0].variant_status : undefined;
  if (observedVariantStatus !== undefined) {
    const withVariantStatus =
      await api.functional.shoppingMall.admin.productVariantSnapshots.index(
        adminConnection,
        {
          body: {
            createdAtFrom: createdAtFrom as string & tags.Format<"date-time">,
            createdAtTo: createdAtTo as string & tags.Format<"date-time">,
            isAvailable: isAvailableRequest,
            variantStatus: observedVariantStatus,
            page,
            limit,
          } satisfies IShoppingMallProductVariantSnapshot.IRequest,
        },
      );
    typia.assert(withVariantStatus);
    TestValidator.predicate(
      "variantStatus filter matches for all returned snapshots",
      () =>
        withVariantStatus.data.every(
          (r) => r.variant_status === observedVariantStatus,
        ),
    );
    TestValidator.predicate(
      "ordering preserved with variantStatus filter",
      () => {
        for (let i = 1; i < withVariantStatus.data.length; i++) {
          const prev = withVariantStatus.data[i - 1];
          const cur = withVariantStatus.data[i];
          if (cur.created_at > prev.created_at) return false;
          if (cur.created_at === prev.created_at && cur.id > prev.id)
            return false;
        }
        return true;
      },
    );
  }
  // Empty-result edge case: far-past time range
  const farPastFrom = new Date(
    now.getTime() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const farPastTo = new Date(
    now.getTime() - 300 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyPage =
    await api.functional.shoppingMall.admin.productVariantSnapshots.index(
      adminConnection,
      {
        body: {
          createdAtFrom: farPastFrom as string & tags.Format<"date-time">,
          createdAtTo: farPastTo as string & tags.Format<"date-time">,
          // Keep other filters to ensure we are only testing time-range non-match.
          isAvailable: isAvailableRequest,
          page,
          limit,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty data length", emptyPage.data.length, 0);
  TestValidator.equals(
    "pagination.records is 0",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals("pagination.pages is 0", emptyPage.pagination.pages, 0);
}
