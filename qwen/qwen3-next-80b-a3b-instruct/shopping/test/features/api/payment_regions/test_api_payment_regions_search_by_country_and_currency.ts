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
export async function test_api_payment_regions_search_by_country_and_currency(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Define search criteria for US regions with USD currency
  const searchCriteria = {
    country_code: "US" satisfies string & tags.MinLength<2> & tags.MaxLength<2>,
    currency: "USD" satisfies string & tags.MinLength<3> & tags.MaxLength<3>,
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallPaymentRegion.IRequest;
  // Execute search with admin connection
  const result = await api.functional.shoppingMall.admin.payment_regions.index(
    adminConnection,
    {
      body: searchCriteria,
    },
  );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records > 0",
    result.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    result.pagination.pages >= 1,
  );
  // Validate each payment region in results
  for (const region of result.data) {
    TestValidator.equals("region country code", region.country_code, "US");
    TestValidator.equals("region currency", region.currency, "USD");
    TestValidator.predicate(
      "region tax rate between 0 and 1",
      region.tax_rate >= 0 && region.tax_rate <= 1,
    );
    TestValidator.predicate(
      "region supports at least one payment method",
      region.supported_payment_methods.length >= 1,
    );
    TestValidator.predicate(
      "region status is one of the valid values",
      ["active", "deprecated", "restricted", "inactive"].includes(
        region.status,
      ),
    );
    TestValidator.predicate(
      "region compliance requirements is a string",
      typeof region.compliance_requirements === "string",
    );
  }
}
