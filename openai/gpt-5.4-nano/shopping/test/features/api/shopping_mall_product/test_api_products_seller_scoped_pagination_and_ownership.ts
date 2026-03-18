import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_products_seller_scoped_pagination_and_ownership(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_member_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSeller = await authorize_member_join(otherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });

  // Create category/product payloads - cast to ICreate to satisfy compile-time requirements
  const productsSeller: IShoppingMallProduct[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) =>
      await generate_random_shopping_mall_member_products_create_product(
        sellerConnection,
        {
          body: {
            code: `seller_${seller.id}_${index}`,
            name: `seller_product_${index}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            is_featured: index % 2 === 0,
          } as unknown as IShoppingMallProduct.ICreate,
        },
      ),
  );
  const otherProduct =
    await generate_random_shopping_mall_member_products_create_product(
      otherSellerConnection,
      {
        body: {
          code: `other_${otherSeller.id}_0`,
          name: "other_product_0",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_featured: false,
        } as unknown as IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(otherProduct);

  const limit = 1;
  const page1 = await api.functional.shoppingMall.member.products.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page1 current", page1.pagination.current, 1);
  TestValidator.equals("page1 limit", page1.pagination.limit, limit);
  TestValidator.predicate(
    "page1 records >= seller product count",
    page1.pagination.records >= productsSeller.length,
  );
  for (const item of page1.data) {
    TestValidator.equals(
      "seller ownership matches",
      (item as any).seller.id,
      seller.id,
    );
  }
  TestValidator.predicate(
    "page1 does not include other seller product",
    !(page1.data as any[]).some((x) => x.id === otherProduct.id),
  );

  const page2 = await api.functional.shoppingMall.member.products.index(
    sellerConnection,
    {
      body: {
        page: 2,
        limit,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page2 current", page2.pagination.current, 2);
  TestValidator.equals("page2 limit", page2.pagination.limit, limit);
  TestValidator.equals(
    "page2 records",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page2 pages",
    page2.pagination.pages,
    page1.pagination.pages,
  );

  const ids1 = new Set((page1.data as any[]).map((x) => x.id));
  const overlap = (page2.data as any[]).some((x) => ids1.has(x.id));
  TestValidator.equals("no overlap between page 1 and 2", overlap, false);

  // Edge: delete all seller products then ensure listing is empty
  await ArrayUtil.asyncForEach(productsSeller, async (p) => {
    await api.functional.shoppingMall.member.products.erase(sellerConnection, {
      productId: p.id,
    });
  });
  const emptyPage = await api.functional.shoppingMall.member.products.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty pages", emptyPage.pagination.pages, 0);
  TestValidator.equals("empty current page", emptyPage.pagination.current, 1);
  TestValidator.predicate("no data in empty page", emptyPage.data.length === 0);
}
