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

export async function test_api_product_variant_snapshot_index_default_pagination_visibility(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCreds });
  const defaultCriteria = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallProductVariantSnapshot.IRequest;
  const firstPageA =
    await api.functional.shoppingMall.admin.productVariantSnapshots.index(
      adminConnection,
      {
        body: defaultCriteria,
      },
    );
  typia.assert(firstPageA);
  TestValidator.equals(
    "pagination current is 1",
    firstPageA.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    firstPageA.pagination.limit,
    10,
  );
  // Visibility/business rule validation: if the endpoint enforces admin visibility,
  // any returned records must be viewable by the admin actor.
  // typia.assert validates the contract; no additional type checks are needed.
  for (const item of firstPageA.data) {
    typia.assert(item);
    typia.assert(item.productVariant);
  }
  // determinism: repeat exact default request and compare the first item's id
  const firstPageB =
    await api.functional.shoppingMall.admin.productVariantSnapshots.index(
      adminConnection,
      {
        body: defaultCriteria,
      },
    );
  typia.assert(firstPageB);
  if (firstPageA.data.length > 0) {
    TestValidator.equals(
      "first item id is deterministic",
      firstPageA.data[0]!.id,
      firstPageB.data[0]!.id,
    );
  }
  // Edge business validation: narrow using productVariantId from a returned snapshot
  if (firstPageA.data.length > 0) {
    const chosen = firstPageA.data[0]!;
    const narrowedCriteria = {
      productVariantId: chosen.productVariant.id,
      page: 1,
      limit: 10,
    } satisfies IShoppingMallProductVariantSnapshot.IRequest;
    const narrowedPage =
      await api.functional.shoppingMall.admin.productVariantSnapshots.index(
        adminConnection,
        {
          body: narrowedCriteria,
        },
      );
    typia.assert(narrowedPage);
    TestValidator.predicate(
      "narrowed response contains the chosen snapshot id",
      () => narrowedPage.data.some((x) => x.id === chosen.id),
    );
  }
}
