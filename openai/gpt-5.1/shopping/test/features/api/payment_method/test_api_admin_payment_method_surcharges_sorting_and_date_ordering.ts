import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethodSurcharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethodSurcharge";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethodSurcharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodSurcharge";

/**
 * Validate sorting of payment method surcharges by creation time.
 *
 * Business goal: Ensure that the admin surcharge listing endpoint PATCH
 * /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges correctly
 * applies sortBy and sortDirection on a stable field (created_at) and that
 * pagination metadata is consistent regardless of sort direction.
 *
 * Scenario:
 *
 * 1. Register an admin to obtain authorization context.
 * 2. Create a dedicated payment method with a unique business code so the
 *    surcharge namespace is isolated for this test.
 * 3. Create three surcharge configurations for that payment method using POST
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges.
 * 4. Query surcharges with sortBy="created_at" and sortDirection="asc" using PATCH
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges and a
 *    sufficiently large limit.
 * 5. Assert that:
 *
 *    - All three created surcharges are present.
 *    - The data array is ordered oldest-to-newest by created_at (reflecting
 *         insertion order).
 * 6. Query again with sortDirection="desc" and verify that:
 *
 *    - The same surcharge ids are returned.
 *    - The order is the reverse of the ascending result.
 * 7. Confirm that pagination metadata (current, limit, records, pages) is
 *    consistent between the asc and desc responses.
 */
export async function test_api_admin_payment_method_surcharges_sorting_and_date_ordering(
  connection: api.IConnection,
) {
  // 1. Register admin and obtain authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test/payment-method-surcharge-sorting" as string &
      tags.Format<"uri">,
    referrer: "https://admin.test/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create a dedicated payment method
  const paymentMethodCode: string = `CARD_SORT_${RandomGenerator.alphaNumeric(8)}`;

  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: `Card Sorting Test ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 0,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);
  TestValidator.equals(
    "created payment method code should match request",
    paymentMethod.code,
    paymentMethodCode,
  );

  // 3. Create three surcharge configurations
  const createSurcharge = async (
    overrides?: Partial<IShoppingMallPaymentMethodSurcharge.ICreate>,
  ): Promise<IShoppingMallPaymentMethodSurcharge> => {
    const baseBody = {
      scope_code: "GLOBAL",
      currency_code: "KRW",
      min_order_amount: 0,
      max_order_amount: 100000,
      fixed_fee_amount: 500,
      percentage_fee_rate: 1.5,
      is_platform_revenue: true,
      refundable_policy: "refundable",
    } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

    const body: IShoppingMallPaymentMethodSurcharge.ICreate = {
      ...baseBody,
      ...overrides,
    };

    const surcharge: IShoppingMallPaymentMethodSurcharge =
      await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
        connection,
        {
          paymentMethodCode,
          body,
        },
      );
    typia.assert<IShoppingMallPaymentMethodSurcharge>(surcharge);
    return surcharge;
  };

  const surcharge1 = await createSurcharge({
    fixed_fee_amount: 100,
    percentage_fee_rate: 0.5,
  });

  const surcharge2 = await createSurcharge({
    fixed_fee_amount: 200,
    percentage_fee_rate: 1.0,
  });

  const surcharge3 = await createSurcharge({
    fixed_fee_amount: 300,
    percentage_fee_rate: 1.5,
  });

  const created = [surcharge1, surcharge2, surcharge3];

  // 4. Query surcharges in ascending order by created_at
  const ascRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sortBy: "created_at",
    sortDirection: "asc",
  } satisfies IShoppingMallPaymentMethodSurcharge.IRequest;

  const ascPage: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode,
        body: ascRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallPaymentMethodSurcharge.ISummary>(ascPage);

  const ascIds = ascPage.data.map((s) => s.id);

  // Sanity: at least 3 surcharges exist and ours are present
  TestValidator.predicate(
    "ascending result should contain at least 3 surcharges",
    ascPage.data.length >= 3,
  );
  created.forEach((surcharge) => {
    TestValidator.predicate(
      `ascending list should contain created surcharge ${surcharge.id}`,
      ascIds.includes(surcharge.id),
    );
  });

  // Validate ascending ordering by created_at
  const isAscOrdered = ascPage.data.every((current, index, array) => {
    if (index === 0) return true;
    const prev = array[index - 1];
    return prev.created_at <= current.created_at;
  });
  TestValidator.predicate(
    "surcharges must be ordered by created_at ascending",
    isAscOrdered,
  );

  // 5. Query surcharges in descending order by created_at
  const descRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies IShoppingMallPaymentMethodSurcharge.IRequest;

  const descPage: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode,
        body: descRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallPaymentMethodSurcharge.ISummary>(descPage);

  const descIds = descPage.data.map((s) => s.id);

  // Validate descending ordering by created_at
  const isDescOrdered = descPage.data.every((current, index, array) => {
    if (index === 0) return true;
    const prev = array[index - 1];
    return prev.created_at >= current.created_at;
  });
  TestValidator.predicate(
    "surcharges must be ordered by created_at descending",
    isDescOrdered,
  );

  // 6. Ensure the same ids are present in both asc and desc (no duplicates/missing)
  ascIds.sort();
  descIds.sort();
  TestValidator.equals(
    "ascending and descending result ids must match (set equality)",
    ascIds,
    descIds,
  );

  // 7. Pagination metadata consistency between asc and desc
  const ascPg = ascPage.pagination;
  const descPg = descPage.pagination;

  TestValidator.equals(
    "pagination current page should match",
    ascPg.current,
    descPg.current,
  );
  TestValidator.equals(
    "pagination limit should match",
    ascPg.limit,
    descPg.limit,
  );
  TestValidator.equals(
    "pagination records should match",
    ascPg.records,
    descPg.records,
  );
  TestValidator.equals(
    "pagination pages should match",
    ascPg.pages,
    descPg.pages,
  );
}
