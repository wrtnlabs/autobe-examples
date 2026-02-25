import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalePromotion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test the sale promotions analytics retrieval with authorized administrator.
 * Authenticates as an administrator by joining first.
 * Submits a request with no filters to retrieve all promotions.
 * Verifies the response contains a paginated list of sale promotion summaries.
 * Checks expected fields in promotions and their associated sale data.
 * Validates pagination metadata consistency.
 */
export async function test_api_administrator_sale_promotions_analytics_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin+${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: `Passw0rd!${RandomGenerator.alphaNumeric(8)}`,
    },
  });
  typia.assert(adminAuthorized);
  // 2. Prepare a request with no filters - defaults to retrieve all promotions
  const requestBody = {};
  // 3. Retrieve paginated sale promotions analytics
  const response =
    await api.functional.shoppingMall.administrator.analytics.sale_promotions.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(response);
  // 4. Confirm pagination metadata consistency
  TestValidator.predicate(
    "pagination current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= length of data",
    response.pagination.records >= response.data.length,
  );
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation",
    response.pagination.pages,
    expectedPages,
  );
  // 5. Verify each sale promotion summary properties
  for (const promotion of response.data) {
    typia.assert(promotion);
    // promotionCode could be undefined or null or string
    if (
      promotion.promotionCode !== null &&
      promotion.promotionCode !== undefined
    ) {
      TestValidator.predicate(
        "promotionCode is string if present",
        typeof promotion.promotionCode === "string",
      );
    }
    TestValidator.predicate(
      "promotionType is string",
      typeof promotion.promotionType === "string" &&
        promotion.promotionType.length > 0,
    );
    TestValidator.predicate(
      "discountValue is number",
      typeof promotion.discountValue === "number" &&
        !isNaN(promotion.discountValue),
    );
    TestValidator.predicate(
      "discountType is string",
      typeof promotion.discountType === "string" &&
        promotion.discountType.length > 0,
    );
    // Dates valid ISO strings
    TestValidator.predicate(
      "startAt is ISO date-time string",
      typeof promotion.startAt === "string" &&
        !isNaN(Date.parse(promotion.startAt)),
    );
    TestValidator.predicate(
      "endAt is ISO date-time string",
      typeof promotion.endAt === "string" &&
        !isNaN(Date.parse(promotion.endAt)),
    );
    TestValidator.predicate(
      "active is boolean",
      typeof promotion.active === "boolean",
    );
    // Verify associated sale summary
    typia.assert(promotion.sale);
    TestValidator.predicate(
      "sale.id is string",
      typeof promotion.sale.id === "string" && promotion.sale.id.length > 0,
    );
    TestValidator.predicate(
      "sale.name is string",
      typeof promotion.sale.name === "string" && promotion.sale.name.length > 0,
    );
    TestValidator.predicate(
      "sale.basePrice is number",
      typeof promotion.sale.basePrice === "number",
    );
    TestValidator.predicate(
      "sale.status is string",
      typeof promotion.sale.status === "string" &&
        promotion.sale.status.length > 0,
    );
    TestValidator.predicate(
      "sale.createdAt is ISO date-time string",
      typeof promotion.sale.createdAt === "string" &&
        !isNaN(Date.parse(promotion.sale.createdAt)),
    );
    TestValidator.predicate(
      "sale.updatedAt is ISO date-time string",
      typeof promotion.sale.updatedAt === "string" &&
        !isNaN(Date.parse(promotion.sale.updatedAt)),
    );
    // deletedAt can be null or ISO string or undefined
    if (
      promotion.sale.deletedAt !== null &&
      promotion.sale.deletedAt !== undefined
    ) {
      TestValidator.predicate(
        "sale.deletedAt is null or ISO string",
        typeof promotion.sale.deletedAt === "string" &&
          !isNaN(Date.parse(promotion.sale.deletedAt)),
      );
    }
    // Verify nested seller summary
    typia.assert(promotion.sale.seller);
    TestValidator.predicate(
      "sale.seller.id is string",
      typeof promotion.sale.seller.id === "string" &&
        promotion.sale.seller.id.length > 0,
    );
    TestValidator.predicate(
      "sale.seller.email is string",
      typeof promotion.sale.seller.email === "string" &&
        promotion.sale.seller.email.length > 0,
    );
    TestValidator.predicate(
      "sale.seller.shopName is string",
      typeof promotion.sale.seller.shopName === "string" &&
        promotion.sale.seller.shopName.length > 0,
    );
    TestValidator.predicate(
      "sale.seller.approvalStatus is string",
      typeof promotion.sale.seller.approvalStatus === "string" &&
        promotion.sale.seller.approvalStatus.length > 0,
    );
    // rejectionReason could be undefined or null or string
    if (
      promotion.sale.seller.rejectionReason !== undefined &&
      promotion.sale.seller.rejectionReason !== null
    ) {
      TestValidator.predicate(
        "sale.seller.rejectionReason is string if present",
        typeof promotion.sale.seller.rejectionReason === "string",
      );
    }
  }
}
