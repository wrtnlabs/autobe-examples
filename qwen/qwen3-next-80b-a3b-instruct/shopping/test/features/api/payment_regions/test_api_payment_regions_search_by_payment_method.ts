import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentRegion";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRegion";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_regions_search_by_payment_method(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Search for payment regions with stripe payment method
  const response: IPageIShoppingMallPaymentRegion.ISummary =
    await api.functional.shoppingMall.admin.payment_regions.index(
      adminConnection,
      {
        body: {
          payment_method: "stripe",
        } satisfies IShoppingMallPaymentRegion.IRequest,
      },
    );
  typia.assert(response);
  // Step 3: Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default 20",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is greater than 0",
    response.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is greater than 0",
    response.pagination.pages > 0,
  );
  // Step 4: Validate that all returned regions support stripe payment method
  TestValidator.predicate(
    "at least one payment region returned",
    response.data.length > 0,
  );
  for (const region of response.data) {
    TestValidator.equals(
      "region has valid uuid id",
      typeof region.id,
      "string",
    );
    TestValidator.equals(
      "region has valid country code format",
      region.country_code.length,
      2,
    );
    TestValidator.equals(
      "region has valid currency format",
      region.currency.length,
      3,
    );
    TestValidator.predicate(
      "region has stripe payment method",
      region.supported_payment_methods.includes("stripe"),
    );
    TestValidator.predicate(
      "region has at least one payment method",
      region.supported_payment_methods.length >= 1,
    );
    // Fix: Must pass actual value for equals, not boolean expression
    TestValidator.equals("region has valid tax rate", region.tax_rate, 0.5);
    // Fix: Use TestValidator.predicate with Array.includes for status validation
    TestValidator.predicate(
      "region has valid status",
      ["active", "deprecated", "restricted", "inactive"].includes(
        region.status,
      ),
    );
    TestValidator.equals(
      "region has compliance requirement",
      typeof region.compliance_requirements,
      "string",
    );
  }
  // Step 5: Confirm that regions without stripe support are excluded
  // (By design of API endpoint - if any region returned doesn't include stripe, it's a failure)
  // We already validated that all regions include stripe via the loop above
}
