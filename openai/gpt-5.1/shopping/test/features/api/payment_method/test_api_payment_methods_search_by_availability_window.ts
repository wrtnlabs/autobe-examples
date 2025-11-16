import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_payment_methods_search_by_availability_window(
  connection: api.IConnection,
) {
  // 1. Join a platform admin to obtain Authorization context
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create three payment methods with distinct availability windows
  const now = new Date();
  const msHour = 60 * 60 * 1000;

  const methodACode = `pm_a_${RandomGenerator.alphaNumeric(6)}`;
  const methodBCode = `pm_b_${RandomGenerator.alphaNumeric(6)}`;
  const methodCCode = `pm_c_${RandomGenerator.alphaNumeric(6)}`;

  const methodABody = {
    code: methodACode,
    display_name: "Method A - active",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_key: "provider_a",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: new Date(now.getTime() - 2 * msHour).toISOString(),
    ends_at: new Date(now.getTime() + 2 * msHour).toISOString(),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const methodBBody = {
    code: methodBCode,
    display_name: "Method B - expired",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_key: "provider_b",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 2 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: new Date(now.getTime() - 4 * msHour).toISOString(),
    ends_at: new Date(now.getTime() - 3 * msHour).toISOString(),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const methodCBody = {
    code: methodCCode,
    display_name: "Method C - upcoming",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_key: "provider_c",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 3 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: new Date(now.getTime() + 3 * msHour).toISOString(),
    ends_at: new Date(now.getTime() + 4 * msHour).toISOString(),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const methodA: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: methodABody },
    );
  typia.assert(methodA);

  const methodB: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: methodBBody },
    );
  typia.assert(methodB);

  const methodC: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: methodCBody },
    );
  typia.assert(methodC);

  // 3. Control query without availability filters to ensure visibility
  const controlPage: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 50 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<200>,
          code: undefined,
          method_type: undefined,
          is_active: true,
          currency_restriction: undefined,
          min_amount_from: undefined,
          min_amount_to: undefined,
          max_amount_from: undefined,
          max_amount_to: undefined,
          available_at_from: undefined,
          available_at_to: undefined,
          search: undefined,
          sort_field: undefined,
          sort_direction: undefined,
        } satisfies IShoppingMallPaymentMethod.IRequest,
      },
    );
  typia.assert(controlPage);

  const controlCodes = controlPage.data.map((m) => m.code);
  TestValidator.predicate(
    "control query should include Method A",
    controlCodes.includes(methodACode),
  );
  TestValidator.predicate(
    "control query should include Method B",
    controlCodes.includes(methodBCode),
  );
  TestValidator.predicate(
    "control query should include Method C",
    controlCodes.includes(methodCCode),
  );

  // 4. Query window Q1 overlapping only Method A
  const q1From = new Date(now.getTime() - 0.5 * msHour).toISOString();
  const q1To = new Date(now.getTime() + 0.5 * msHour).toISOString();

  const q1Page: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 50 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<200>,
          code: undefined,
          method_type: undefined,
          is_active: true,
          currency_restriction: undefined,
          min_amount_from: undefined,
          min_amount_to: undefined,
          max_amount_from: undefined,
          max_amount_to: undefined,
          available_at_from: q1From,
          available_at_to: q1To,
          search: undefined,
          sort_field: undefined,
          sort_direction: undefined,
        } satisfies IShoppingMallPaymentMethod.IRequest,
      },
    );
  typia.assert(q1Page);

  const q1Codes = q1Page.data.map((m) => m.code);
  TestValidator.predicate(
    "Q1 results should include Method A",
    q1Codes.includes(methodACode),
  );
  TestValidator.predicate(
    "Q1 results should NOT include Method B",
    !q1Codes.includes(methodBCode),
  );
  TestValidator.predicate(
    "Q1 results should NOT include Method C",
    !q1Codes.includes(methodCCode),
  );

  // 5. Query window Q2 overlapping only Method C
  const q2From = new Date(
    now.getTime() + 3 * msHour + 15 * 60 * 1000,
  ).toISOString();
  const q2To = new Date(
    now.getTime() + 3 * msHour + 45 * 60 * 1000,
  ).toISOString();

  const q2Page: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 50 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<200>,
          code: undefined,
          method_type: undefined,
          is_active: true,
          currency_restriction: undefined,
          min_amount_from: undefined,
          min_amount_to: undefined,
          max_amount_from: undefined,
          max_amount_to: undefined,
          available_at_from: q2From,
          available_at_to: q2To,
          search: undefined,
          sort_field: undefined,
          sort_direction: undefined,
        } satisfies IShoppingMallPaymentMethod.IRequest,
      },
    );
  typia.assert(q2Page);

  const q2Codes = q2Page.data.map((m) => m.code);
  TestValidator.predicate(
    "Q2 results should include Method C",
    q2Codes.includes(methodCCode),
  );
  TestValidator.predicate(
    "Q2 results should NOT include Method A",
    !q2Codes.includes(methodACode),
  );
  TestValidator.predicate(
    "Q2 results should NOT include Method B",
    !q2Codes.includes(methodBCode),
  );
}
