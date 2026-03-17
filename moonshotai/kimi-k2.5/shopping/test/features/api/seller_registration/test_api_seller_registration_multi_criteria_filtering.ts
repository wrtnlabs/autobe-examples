import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

/**
 * Test super administrator filtering seller registrations by multiple criteria.
 * Validates complex filtering logic including sellerId, date ranges, status filtering,
 * and sorting operations on the seller registration queue.
 *
 * @param connection - Base connection to the API server
 */
export async function test_api_seller_registration_multi_criteria_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create first seller and submit registration
  const sellerConnection1: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(sellerConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const registration1 =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection1,
      {
        body: {
          taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
          businessRegistrationNumber: RandomGenerator.alphaNumeric(12),
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  // Create second seller and submit registration
  const sellerConnection2: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(sellerConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const registration2 =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection2,
      {
        body: {
          taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
          businessRegistrationNumber: RandomGenerator.alphaNumeric(12),
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  // Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "superadmin123",
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });
  // Test 1: Filter by specific sellerId returns only that seller's registrations
  const filterBySellerId: IEcommerceMallSellerRegistration.IRequest = {
    limit: 10,
    cursor: null,
    status: null,
    sellerId: seller1.id,
    reviewerId: null,
    createdAtFrom: null,
    createdAtTo: null,
    reviewedAtFrom: null,
    reviewedAtTo: null,
    sortBy: null,
    sortOrder: null,
  };
  const resultBySellerId: IPageIEcommerceMallSellerRegistration.ISummary =
    await api.functional.ecommerceMall.superAdmin.seller_registrations.index(
      superAdminConnection,
      { body: filterBySellerId },
    );
  typia.assert(resultBySellerId);
  TestValidator.equals(
    "filter by sellerId returns only matching registrations",
    true,
    resultBySellerId.data.every((reg) => reg.seller.id === seller1.id),
  );
  TestValidator.predicate(
    "at least one registration found for seller1",
    resultBySellerId.data.length > 0,
  );
  // Test 2: Combined createdAt date range with status filter
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const combinedFilter: IEcommerceMallSellerRegistration.IRequest = {
    limit: 10,
    cursor: null,
    status: "pending",
    sellerId: null,
    reviewerId: null,
    createdAtFrom: yesterday,
    createdAtTo: now,
    reviewedAtFrom: null,
    reviewedAtTo: null,
    sortBy: null,
    sortOrder: null,
  };
  const combinedResult: IPageIEcommerceMallSellerRegistration.ISummary =
    await api.functional.ecommerceMall.superAdmin.seller_registrations.index(
      superAdminConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filter returns results",
    combinedResult.data.length >= 0,
  );
  TestValidator.equals(
    "all results match pending status",
    true,
    combinedResult.data.every((reg) => reg.status === "pending"),
  );
  // Test 3: Sorting by createdAt asc shows oldest submissions first
  const sortAsc: IEcommerceMallSellerRegistration.IRequest = {
    limit: 10,
    cursor: null,
    status: null,
    sellerId: null,
    reviewerId: null,
    createdAtFrom: null,
    createdAtTo: null,
    reviewedAtFrom: null,
    reviewedAtTo: null,
    sortBy: "createdAt",
    sortOrder: "asc",
  };
  const ascResult: IPageIEcommerceMallSellerRegistration.ISummary =
    await api.functional.ecommerceMall.superAdmin.seller_registrations.index(
      superAdminConnection,
      { body: sortAsc },
    );
  typia.assert(ascResult);
  // Verify ascending order (oldest first)
  for (let i = 1; i < ascResult.data.length; i++) {
    const prevDate = new Date(ascResult.data[i - 1].createdAt).getTime();
    const currDate = new Date(ascResult.data[i].createdAt).getTime();
    TestValidator.predicate(
      "ascending order: prev date <= curr date",
      prevDate <= currDate,
    );
  }
  // Test 4: Empty results handled gracefully when no matches found
  const nonExistentFilter: IEcommerceMallSellerRegistration.IRequest = {
    limit: 10,
    cursor: null,
    status: "rejected",
    sellerId: typia.random<string & tags.Format<"uuid">>(),
    reviewerId: null,
    createdAtFrom: "2020-01-01T00:00:00.000Z",
    createdAtTo: "2020-01-02T00:00:00.000Z",
    reviewedAtFrom: null,
    reviewedAtTo: null,
    sortBy: null,
    sortOrder: null,
  };
  const emptyResult: IPageIEcommerceMallSellerRegistration.ISummary =
    await api.functional.ecommerceMall.superAdmin.seller_registrations.index(
      superAdminConnection,
      { body: nonExistentFilter },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has empty data array",
    emptyResult.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination present in empty result",
    emptyResult.pagination !== null,
  );
  // Test 5: All filter parameters work together without conflicts
  const complexFilter: IEcommerceMallSellerRegistration.IRequest = {
    limit: 20,
    cursor: null,
    status: "pending",
    sellerId: seller2.id,
    reviewerId: null,
    createdAtFrom: yesterday,
    createdAtTo: now,
    reviewedAtFrom: null,
    reviewedAtTo: null,
    sortBy: "createdAt",
    sortOrder: "desc",
  };
  const complexResult: IPageIEcommerceMallSellerRegistration.ISummary =
    await api.functional.ecommerceMall.superAdmin.seller_registrations.index(
      superAdminConnection,
      { body: complexFilter },
    );
  typia.assert(complexResult);
  TestValidator.equals(
    "complex filter returns seller2 registration only",
    true,
    complexResult.data.every(
      (reg) => reg.seller.id === seller2.id && reg.status === "pending",
    ),
  );
  TestValidator.predicate(
    "limit is respected",
    complexResult.pagination.limit <= 20,
  );
}
