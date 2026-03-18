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

export async function test_api_product_variant_snapshots_visibility_enforcement_member_a_only(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  // Authenticate both members
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAAuth);
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 1) Member A: find a candidate active snapshot
  const pageAFirst =
    await api.functional.shoppingMall.member.productVariantSnapshots.index(
      memberAConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(pageAFirst);
  const targetFromA = pageAFirst.data.find((s) => s.deleted_at === null);
  if (!targetFromA) {
    throw new Error(
      "Test precondition failed: no active product-variant snapshot found for member A.",
    );
  }
  const targetSnapshotId = targetFromA.id;
  const targetProductVariantId = targetFromA.productVariant.id;
  // 2) Member A: apply the narrow filter used for visibility enforcement
  const pageAFiltered =
    await api.functional.shoppingMall.member.productVariantSnapshots.index(
      memberAConnection,
      {
        body: {
          productVariantId: targetProductVariantId,
          page: 1,
          limit: 50,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(pageAFiltered);
  TestValidator.predicate(
    "member A can see the target snapshot with the narrow filter",
    () => pageAFiltered.data.some((s) => s.id === targetSnapshotId),
  );
  // 3) Member B: request with the same narrow filter
  const pageBFiltered =
    await api.functional.shoppingMall.member.productVariantSnapshots.index(
      memberBConnection,
      {
        body: {
          productVariantId: targetProductVariantId,
          page: 1,
          limit: 50,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(pageBFiltered);
  // Validate target snapshot is not visible to member B
  TestValidator.predicate("member B must not see the target snapshot", () =>
    pageBFiltered.data.every((s) => s.id !== targetSnapshotId),
  );
  // Pagination should still be valid
  TestValidator.predicate("pagination pages is consistent", () => {
    const { pagination } = pageBFiltered;
    const expectedPages =
      pagination.limit > 0
        ? Math.ceil(pagination.records / pagination.limit)
        : 0;
    return pagination.pages === expectedPages;
  });
}
