import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_product_images_create } from "../../../generate/generate_random_shopping_mall_member_product_images_create";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_images_keyword_and_deleted_filtering(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(memberAuth);
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      memberConnection,
      {
        body: undefined,
      },
    );
  typia.assert(product);
  const hrefKeyword = `href-${RandomGenerator.alphabets(6)}`;
  const altTextKeyword = `alt-${RandomGenerator.alphabets(6)}`;
  const otherHref = `href-other-${RandomGenerator.alphabets(6)}`;
  const otherAlt = `alt-other-${RandomGenerator.alphabets(6)}`;
  const matchingImage =
    await generate_random_shopping_mall_member_product_images_create(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          href: `https://example.com/${hrefKeyword}/a.jpg`,
          alt_text: `some ${altTextKeyword} text`,
          display_order: 1,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(matchingImage);
  const matchingHrefOnlyImage =
    await generate_random_shopping_mall_member_product_images_create(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          href: `https://example.com/${hrefKeyword}/b.jpg`,
          alt_text: `no match ${otherAlt}`,
          display_order: 2,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(matchingHrefOnlyImage);
  const matchingAltOnlyImage =
    await generate_random_shopping_mall_member_product_images_create(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          href: `https://example.com/${otherHref}/c.jpg`,
          alt_text: `contains ${altTextKeyword} only`,
          display_order: 3,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(matchingAltOnlyImage);
  const nonMatchingImage =
    await generate_random_shopping_mall_member_product_images_create(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          href: `https://example.com/${otherHref}/d.jpg`,
          alt_text: `neither ${otherAlt} ${hrefKeyword} ${altTextKeyword}`,
          display_order: 4,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(nonMatchingImage);
  await api.functional.shoppingMall.member.productImages.erase(
    memberConnection,
    {
      productImageId: matchingHrefOnlyImage.id,
    },
  );
  const deletedTarget =
    await api.functional.shoppingMall.member.productImages.at(
      memberConnection,
      {
        productImageId: matchingHrefOnlyImage.id,
      },
    );
  typia.assert(deletedTarget);
  TestValidator.predicate(
    "deleted target should be soft-deleted",
    () => deletedTarget.deleted_at !== null,
  );
  const deletedAt = deletedTarget.deleted_at;
  const activePage =
    await api.functional.shoppingMall.member.productImages.index(
      memberConnection,
      {
        body: {
          shoppingMallProductId: product.id,
          hrefKeyword,
          deletedAt: null,
          sort: "displayOrderAsc",
          page: 1,
          limit: 50,
        } satisfies IShoppingMallProductImage.IRequest,
      },
    );
  typia.assert(activePage);
  TestValidator.predicate("active results are scoped to product", () =>
    activePage.data.every((x) => x.shopping_mall_product_id === product.id),
  );
  TestValidator.predicate("active results have deleted_at null", () =>
    activePage.data.every((x) => x.deleted_at === null),
  );
  TestValidator.predicate("active results match href keyword", () =>
    activePage.data.every((x) => x.href.includes(hrefKeyword)),
  );
  TestValidator.predicate(
    "active results do not include erased image",
    () => !activePage.data.some((x) => x.id === matchingHrefOnlyImage.id),
  );
  const deletedPage =
    await api.functional.shoppingMall.member.productImages.index(
      memberConnection,
      {
        body: {
          shoppingMallProductId: product.id,
          hrefKeyword,
          deletedAt: deletedAt,
          sort: "displayOrderAsc",
          page: 1,
          limit: 50,
        } satisfies IShoppingMallProductImage.IRequest,
      },
    );
  typia.assert(deletedPage);
  TestValidator.predicate("deleted results are scoped to product", () =>
    deletedPage.data.every((x) => x.shopping_mall_product_id === product.id),
  );
  TestValidator.predicate(
    "deleted results have deleted_at equal to requested timestamp",
    () => deletedPage.data.every((x) => x.deleted_at === deletedAt),
  );
  TestValidator.predicate("deleted results match href keyword", () =>
    deletedPage.data.every((x) => x.href.includes(hrefKeyword)),
  );
  TestValidator.equals(
    "deleted results count should be 1",
    deletedPage.data.length,
    1,
  );
  TestValidator.equals(
    "deleted result id should be the erased one",
    deletedPage.data[0].id,
    matchingHrefOnlyImage.id,
  );
}
