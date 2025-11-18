import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_product_search_visibility_and_status_rules(
  connection: api.IConnection,
) {
  // 1. Register a seller (authentication context for creating products)
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://shoppingmall.example.com/seller/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create multiple products with different lifecycle statuses
  const baseCode = RandomGenerator.alphaNumeric(10);

  const activeProductBody = {
    code: `${baseCode}-ACTIVE`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const draftProductBody = {
    code: `${baseCode}-DRAFT`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "draft",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const inactiveProductBody = {
    code: `${baseCode}-INACTIVE`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "inactive",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const activeProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: activeProductBody,
    });
  typia.assert<IShoppingMallProduct>(activeProduct);

  const draftProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: draftProductBody,
    });
  typia.assert<IShoppingMallProduct>(draftProduct);

  const inactiveProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: inactiveProductBody,
    });
  typia.assert<IShoppingMallProduct>(inactiveProduct);

  // 3. Default public search without explicit status filter, scoped to this seller
  const defaultSearchBody = {
    seller_id: seller.id,
    limit: 50,
    sort_by: "newest",
    sort_direction: "desc",
  } satisfies IShoppingMallProduct.IRequest;

  const defaultPage: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: defaultSearchBody,
    });
  typia.assert<IPageIShoppingMallProduct.ISummary>(defaultPage);

  const defaultSummaries: IShoppingMallProduct.ISummary[] = defaultPage.data;

  const activeSummary = defaultSummaries.find(
    (summary) => summary.id === activeProduct.id,
  );
  const draftSummary = defaultSummaries.find(
    (summary) => summary.id === draftProduct.id,
  );
  const inactiveSummary = defaultSummaries.find(
    (summary) => summary.id === inactiveProduct.id,
  );

  // Active product should be present and visible in default search
  TestValidator.predicate(
    "active product present in default search",
    activeSummary !== undefined,
  );

  if (activeSummary !== undefined) {
    TestValidator.predicate(
      "active product isVisible is true in default search",
      activeSummary.isVisible === true,
    );
  }

  // Draft and inactive products should not appear in default public search
  TestValidator.predicate(
    "draft product absent in default search",
    draftSummary === undefined,
  );
  TestValidator.predicate(
    "inactive product absent in default search",
    inactiveSummary === undefined,
  );

  // 4. Explicit status filter: draft
  const draftSearchBody = {
    seller_id: seller.id,
    status: "draft",
    limit: 50,
    sort_by: "newest",
    sort_direction: "desc",
  } satisfies IShoppingMallProduct.IRequest;

  const draftPage: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: draftSearchBody,
    });
  typia.assert<IPageIShoppingMallProduct.ISummary>(draftPage);

  const draftSummaries: IShoppingMallProduct.ISummary[] = draftPage.data;

  const draftSearchActiveSummary = draftSummaries.find(
    (summary) => summary.id === activeProduct.id,
  );
  const draftSearchDraftSummary = draftSummaries.find(
    (summary) => summary.id === draftProduct.id,
  );
  const draftSearchInactiveSummary = draftSummaries.find(
    (summary) => summary.id === inactiveProduct.id,
  );

  TestValidator.predicate(
    "draft search excludes active product",
    draftSearchActiveSummary === undefined,
  );
  TestValidator.predicate(
    "draft search excludes inactive product",
    draftSearchInactiveSummary === undefined,
  );

  if (draftSearchDraftSummary !== undefined) {
    TestValidator.predicate(
      "draft product is not visible when filtered by draft status",
      draftSearchDraftSummary.isVisible === false,
    );
  }

  // 5. Explicit status filter: inactive
  const inactiveSearchBody = {
    seller_id: seller.id,
    status: "inactive",
    limit: 50,
    sort_by: "newest",
    sort_direction: "desc",
  } satisfies IShoppingMallProduct.IRequest;

  const inactivePage: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: inactiveSearchBody,
    });
  typia.assert<IPageIShoppingMallProduct.ISummary>(inactivePage);

  const inactiveSummaries: IShoppingMallProduct.ISummary[] = inactivePage.data;

  const inactiveSearchActiveSummary = inactiveSummaries.find(
    (summary) => summary.id === activeProduct.id,
  );
  const inactiveSearchDraftSummary = inactiveSummaries.find(
    (summary) => summary.id === draftProduct.id,
  );
  const inactiveSearchInactiveSummary = inactiveSummaries.find(
    (summary) => summary.id === inactiveProduct.id,
  );

  TestValidator.predicate(
    "inactive search excludes active product",
    inactiveSearchActiveSummary === undefined,
  );
  TestValidator.predicate(
    "inactive search excludes draft product",
    inactiveSearchDraftSummary === undefined,
  );

  if (inactiveSearchInactiveSummary !== undefined) {
    TestValidator.predicate(
      "inactive product is not visible when filtered by inactive status",
      inactiveSearchInactiveSummary.isVisible === false,
    );
  }
}
