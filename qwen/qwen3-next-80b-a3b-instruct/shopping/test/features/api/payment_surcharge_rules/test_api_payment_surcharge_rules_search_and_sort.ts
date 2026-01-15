import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentSurchargeRule";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSurchargeRule";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_surcharge_rules_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Search for payment surcharge rules containing 'crypto' in payment_method_type or description, sorted by surcharge_percentage descending
  const result =
    await api.functional.shoppingMall.admin.payment_surcharge_rules.index(
      adminConnection,
      {
        body: {
          search: "crypto",
          sort_by: "percentage",
          order: "desc",
        } satisfies IShoppingMallPaymentSurchargeRule.IRequest,
      },
    );
  typia.assert(result);
  // Validate search returned at least one result
  TestValidator.predicate(
    "search returned at least one result",
    result.data.length > 0,
  );
  // Validate that search results contain only rules with 'crypto' in payment_method_type or description
  for (const rule of result.data) {
    TestValidator.predicate(
      "rule contains 'crypto' in payment_method_type or description",
      (rule.payment_method_type?.toLowerCase().includes("crypto") ?? false) ||
        (rule.description ? rule.description.toLowerCase().includes("crypto") : false),
    );
  }
  // Validate that rules are sorted by surcharge_percentage in descending order
  for (let i = 0; i < result.data.length - 1; i++) {
    TestValidator.predicate(
      "rules sorted by surcharge_percentage descending",
      result.data[i].surcharge_percentage >=
        result.data[i + 1].surcharge_percentage,
    );
  }
}