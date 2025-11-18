import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSubscriptionPlan";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

export async function test_api_seller_subscription_plans_sorting(
  connection: api.IConnection,
) {
  // Prepare a base request: first page, large limit, no filters, sort by price asc
  const baseRequest = {
    page: 1,
    limit: 50,
    search: null,
    code: null,
    name: null,
    billing_period: null,
    is_active: null,
    price_min: null,
    price_max: null,
    effective_from_start: null,
    effective_from_end: null,
    sort_key: "price_amount",
    sort_order: "asc",
  } satisfies IShoppingMallSellerSubscriptionPlan.IRequest;

  // 1. Call with ascending price sort
  const ascPage: IPageIShoppingMallSellerSubscriptionPlan.ISummary =
    await api.functional.shoppingMall.sellerSubscriptionPlans.index(
      connection,
      {
        body: baseRequest,
      },
    );
  typia.assert<IPageIShoppingMallSellerSubscriptionPlan.ISummary>(ascPage);

  // Basic sanity checks
  TestValidator.predicate(
    "ascending page has non-negative records",
    ascPage.pagination.records >= 0,
  );

  // If there is 0 or 1 record, sorting checks are trivial but we still ensure no crash.
  if (ascPage.data.length >= 2) {
    // Verify non-decreasing order of price_amount
    for (let i = 1; i < ascPage.data.length; ++i) {
      const prev = ascPage.data[i - 1];
      const curr = ascPage.data[i];
      TestValidator.predicate(
        `ascending price_amount sorted at index ${i}`,
        prev.price_amount <= curr.price_amount,
      );
    }
  }

  // 2. Call with descending price sort
  const descRequest = {
    ...baseRequest,
    sort_order: "desc",
  } satisfies IShoppingMallSellerSubscriptionPlan.IRequest;

  const descPage: IPageIShoppingMallSellerSubscriptionPlan.ISummary =
    await api.functional.shoppingMall.sellerSubscriptionPlans.index(
      connection,
      {
        body: descRequest,
      },
    );
  typia.assert<IPageIShoppingMallSellerSubscriptionPlan.ISummary>(descPage);

  // Sanity and stability checks on pagination
  TestValidator.equals(
    "records count is stable between asc and desc",
    ascPage.pagination.records,
    descPage.pagination.records,
  );
  TestValidator.predicate(
    "descending page has non-negative records",
    descPage.pagination.records >= 0,
  );

  if (descPage.data.length >= 2) {
    for (let i = 1; i < descPage.data.length; ++i) {
      const prev = descPage.data[i - 1];
      const curr = descPage.data[i];
      TestValidator.predicate(
        `descending price_amount sorted at index ${i}`,
        prev.price_amount >= curr.price_amount,
      );
    }
  }

  // 3. Optionally, if there are at least two items and prices differ somewhere,
  //    confirm that the ordering between asc and desc is not identical.
  if (ascPage.data.length >= 2 && descPage.data.length >= 2) {
    const hasPriceVariance = ascPage.data.some((plan, index) => {
      const other = descPage.data[index];
      return other !== undefined && other.price_amount !== plan.price_amount;
    });

    if (hasPriceVariance) {
      const sameOrder = ascPage.data.every((plan, index) => {
        const other = descPage.data[index];
        return (
          other !== undefined &&
          other.id === plan.id &&
          other.price_amount === plan.price_amount
        );
      });

      TestValidator.predicate(
        "asc and desc orders should differ when price_amount values vary",
        sameOrder === false,
      );
    }
  }

  // 4. Optionally test sorting by effective_from if enough data has this field defined
  const ascEffectiveRequest = {
    ...baseRequest,
    sort_key: "effective_from",
    sort_order: "asc",
  } satisfies IShoppingMallSellerSubscriptionPlan.IRequest;

  const ascEffectivePage: IPageIShoppingMallSellerSubscriptionPlan.ISummary =
    await api.functional.shoppingMall.sellerSubscriptionPlans.index(
      connection,
      {
        body: ascEffectiveRequest,
      },
    );
  typia.assert<IPageIShoppingMallSellerSubscriptionPlan.ISummary>(
    ascEffectivePage,
  );

  // Filter items that actually have effective_from defined
  const ascEffectiveData = ascEffectivePage.data.filter(
    (plan) => plan.effective_from !== undefined,
  );

  if (ascEffectiveData.length >= 2) {
    for (let i = 1; i < ascEffectiveData.length; ++i) {
      const prev = ascEffectiveData[i - 1];
      const curr = ascEffectiveData[i];
      const prevTime = new Date(prev.effective_from as string).getTime();
      const currTime = new Date(curr.effective_from as string).getTime();

      TestValidator.predicate(
        `ascending effective_from sorted at filtered index ${i}`,
        prevTime <= currTime,
      );
    }

    const descEffectiveRequest = {
      ...ascEffectiveRequest,
      sort_order: "desc",
    } satisfies IShoppingMallSellerSubscriptionPlan.IRequest;

    const descEffectivePage: IPageIShoppingMallSellerSubscriptionPlan.ISummary =
      await api.functional.shoppingMall.sellerSubscriptionPlans.index(
        connection,
        {
          body: descEffectiveRequest,
        },
      );
    typia.assert<IPageIShoppingMallSellerSubscriptionPlan.ISummary>(
      descEffectivePage,
    );

    const descEffectiveData = descEffectivePage.data.filter(
      (plan) => plan.effective_from !== undefined,
    );

    if (descEffectiveData.length >= 2) {
      for (let i = 1; i < descEffectiveData.length; ++i) {
        const prev = descEffectiveData[i - 1];
        const curr = descEffectiveData[i];
        const prevTime = new Date(prev.effective_from as string).getTime();
        const currTime = new Date(curr.effective_from as string).getTime();

        TestValidator.predicate(
          `descending effective_from sorted at filtered index ${i}`,
          prevTime >= currTime,
        );
      }

      const hasEffectiveVariance = ascEffectiveData.some((plan, index) => {
        const other = descEffectiveData[index];
        return (
          other !== undefined && other.effective_from !== plan.effective_from
        );
      });

      if (hasEffectiveVariance) {
        const sameEffectiveOrder = ascEffectiveData.every((plan, index) => {
          const other = descEffectiveData[index];
          return (
            other !== undefined &&
            other.id === plan.id &&
            other.effective_from === plan.effective_from
          );
        });

        TestValidator.predicate(
          "asc and desc effective_from orders should differ when timestamps vary",
          sameEffectiveOrder === false,
        );
      }
    }
  }
}
