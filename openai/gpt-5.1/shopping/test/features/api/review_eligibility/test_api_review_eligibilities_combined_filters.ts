import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewEligibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewEligibility";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewEligibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewEligibility";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

export async function test_api_review_eligibilities_combined_filters(
  connection: api.IConnection,
) {
  // 1. Register a customer and obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Perform an initial broad search for review eligibilities
  const initialRequestBody = {
    customer_id: customer.id,
    product_id: null,
    sku_id: null,
    order_item_id: null,
    status: null,
    eligible_from_from: null,
    eligible_from_to: null,
    eligible_until_from: null,
    eligible_until_to: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallReviewEligibility.IRequest;

  const initialPage: IPageIShoppingMallReviewEligibility.ISummary =
    await api.functional.shoppingMall.customer.reviewEligibilities.index(
      connection,
      { body: initialRequestBody },
    );
  typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(initialPage);

  const { pagination, data } = initialPage;
  typia.assert<IPage.IPagination>(pagination);

  // Basic structural validations on initial result
  TestValidator.predicate(
    "pagination current page should be >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    pagination.pages >= 0,
  );

  // All eligibilities should belong to the authenticated customer (when any)
  for (const eligibility of data) {
    typia.assert<IShoppingMallReviewEligibility.ISummary>(eligibility);
    TestValidator.equals(
      "eligibility customer id must match authenticated customer",
      eligibility.customer.id,
      customer.id,
    );
  }

  // If there are no eligibilities yet, we can only validate the empty result behavior
  if (data.length === 0) {
    TestValidator.equals(
      "no eligibilities should yield empty data array",
      data.length,
      0,
    );
    return;
  }

  // 3. Pick a representative eligibility to derive filter values
  const baseEligibility: IShoppingMallReviewEligibility.ISummary = data[0];
  const baseProductId = baseEligibility.product.id;
  const baseStatus = baseEligibility.status;
  const baseSkuId: string | null = baseEligibility.sku
    ? baseEligibility.sku.id
    : null;

  // 4. Search by product_id + status
  const productAndStatusRequestBody = {
    customer_id: customer.id,
    product_id: baseProductId,
    sku_id: null,
    order_item_id: null,
    status: baseStatus,
    eligible_from_from: null,
    eligible_from_to: null,
    eligible_until_from: null,
    eligible_until_to: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallReviewEligibility.IRequest;

  const productAndStatusPage: IPageIShoppingMallReviewEligibility.ISummary =
    await api.functional.shoppingMall.customer.reviewEligibilities.index(
      connection,
      { body: productAndStatusRequestBody },
    );
  typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(
    productAndStatusPage,
  );

  for (const eligibility of productAndStatusPage.data) {
    typia.assert<IShoppingMallReviewEligibility.ISummary>(eligibility);
    TestValidator.equals(
      "product+status filter: customer id matches",
      eligibility.customer.id,
      customer.id,
    );
    TestValidator.equals(
      "product+status filter: product id matches",
      eligibility.product.id,
      baseProductId,
    );
    TestValidator.equals(
      "product+status filter: status matches",
      eligibility.status,
      baseStatus,
    );
  }

  // 5. If the base eligibility has a SKU, test product_id + sku_id + status
  if (baseSkuId !== null) {
    const productSkuStatusRequestBody = {
      customer_id: customer.id,
      product_id: baseProductId,
      sku_id: baseSkuId,
      order_item_id: null,
      status: baseStatus,
      eligible_from_from: null,
      eligible_from_to: null,
      eligible_until_from: null,
      eligible_until_to: null,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
      sort_by: null,
      sort_direction: null,
    } satisfies IShoppingMallReviewEligibility.IRequest;

    const productSkuStatusPage: IPageIShoppingMallReviewEligibility.ISummary =
      await api.functional.shoppingMall.customer.reviewEligibilities.index(
        connection,
        { body: productSkuStatusRequestBody },
      );
    typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(
      productSkuStatusPage,
    );

    // Every returned eligibility must match all three filters
    for (const eligibility of productSkuStatusPage.data) {
      typia.assert<IShoppingMallReviewEligibility.ISummary>(eligibility);
      TestValidator.equals(
        "product+sku+status filter: customer id matches",
        eligibility.customer.id,
        customer.id,
      );
      TestValidator.equals(
        "product+sku+status filter: product id matches",
        eligibility.product.id,
        baseProductId,
      );
      TestValidator.equals(
        "product+sku+status filter: status matches",
        eligibility.status,
        baseStatus,
      );
      TestValidator.predicate(
        "product+sku+status filter: sku must be present",
        eligibility.sku !== null && eligibility.sku !== undefined,
      );
      if (eligibility.sku !== null && eligibility.sku !== undefined) {
        TestValidator.equals(
          "product+sku+status filter: sku id matches",
          eligibility.sku.id,
          baseSkuId,
        );
      }
    }

    // 6. Compare results between product+status and product+sku+status to ensure narrowing
    TestValidator.predicate(
      "product+status results should be at least as broad as product+sku+status",
      productAndStatusPage.data.length >= productSkuStatusPage.data.length,
    );
  }
}
