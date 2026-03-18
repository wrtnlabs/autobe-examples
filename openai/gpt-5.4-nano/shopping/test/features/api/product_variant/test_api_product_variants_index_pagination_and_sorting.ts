import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_product_variants_index_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinOutput: IShoppingMallMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallMember.IJoin,
    });
  typia.assert(joinOutput);
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const broadPage1: IPageIShoppingMallProductVariant.ISummary =
    await api.functional.shoppingMall.member.productVariants.index(
      memberConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit,
          sort: "created_at",
          order: "desc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(broadPage1);
  const shoppingMallProductId: (string & tags.Format<"uuid">) | undefined =
    broadPage1.data[0]?.product?.id;
  if (shoppingMallProductId === undefined) {
    throw new Error("No product scope derived from product variants list");
  }
  const page1: IPageIShoppingMallProductVariant.ISummary =
    await api.functional.shoppingMall.member.productVariants.index(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: shoppingMallProductId,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit,
          sort: "created_at",
          order: "desc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(page1);
  const page2: IPageIShoppingMallProductVariant.ISummary =
    await api.functional.shoppingMall.member.productVariants.index(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: shoppingMallProductId,
          page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit,
          sort: "created_at",
          order: "desc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("pagination limit page1", page1.pagination.limit, limit);
  TestValidator.equals("pagination limit page2", page2.pagination.limit, limit);
  const ids1 = page1.data.map((x) => x.id);
  const ids2 = page2.data.map((x) => x.id);
  const ids1Set = new Set(ids1);
  const overlap = ids2.filter((id) => ids1Set.has(id));
  TestValidator.predicate(
    "page1 and page2 variant ids should be disjoint",
    overlap.length === 0,
  );
  const union = new Set([...ids1, ...ids2]);
  TestValidator.predicate(
    "union size should not exceed total records",
    union.size <= page1.pagination.records,
  );
  const sortedPage1: IPageIShoppingMallProductVariant.ISummary =
    await api.functional.shoppingMall.member.productVariants.index(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: shoppingMallProductId,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit,
          sort: "created_at",
          order: "desc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(sortedPage1);
  const sortedPage2: IPageIShoppingMallProductVariant.ISummary =
    await api.functional.shoppingMall.member.productVariants.index(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: shoppingMallProductId,
          page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit,
          sort: "created_at",
          order: "desc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(sortedPage2);
  const createdAt1 = sortedPage1.data.map((x) => Date.parse(x.created_at));
  const createdAt2 = sortedPage2.data.map((x) => Date.parse(x.created_at));
  TestValidator.predicate(
    "within page1 created_at should be non-increasing",
    createdAt1.every((t, i, arr) => i === 0 || arr[i - 1] >= t),
  );
  TestValidator.predicate(
    "within page2 created_at should be non-increasing",
    createdAt2.every((t, i, arr) => i === 0 || arr[i - 1] >= t),
  );
  const max1 = createdAt1.length > 0 ? Math.max(...createdAt1) : -Infinity;
  const min2 = createdAt2.length > 0 ? Math.min(...createdAt2) : Infinity;
  TestValidator.predicate(
    "page boundary max(created_at page1) >= min(created_at page2)",
    max1 >= min2,
  );
  const sortedPage1Repeat: IPageIShoppingMallProductVariant.ISummary =
    await api.functional.shoppingMall.member.productVariants.index(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: shoppingMallProductId,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit,
          sort: "created_at",
          order: "desc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(sortedPage1Repeat);
  TestValidator.equals(
    "deterministic ordering of page1 ids",
    sortedPage1.data.map((x) => x.id),
    sortedPage1Repeat.data.map((x) => x.id),
  );
}
