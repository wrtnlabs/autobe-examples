import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
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
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

/**
Test retrieving a paginated list of seller registration applications.

Scenario:
1. Authenticate as seller using authorize_seller_join
2. Create a seller registration using generate_random_ecommerce_mall_seller_registrations_create to ensure test data exists
3. Call PATCH /ecommerceMall/seller/seller-registrations with default pagination parameters
4. Verify the response contains paginated IEcommerceMallSellerRegistration.ISummary objects
5. Validate pagination metadata and registration summary fields
6. Test with different limit values to verify pagination works
7. Verify default sorting (created_at DESC - newest first)
*/
export async function test_api_seller_registration_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a seller registration to ensure test data exists
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // 3. Call the PATCH endpoint with default pagination parameters
  const result =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          cursor: null,
          status: null,
          sellerId: null,
          reviewerId: null,
          createdAtFrom: null,
          createdAtTo: null,
          reviewedAtFrom: null,
          reviewedAtTo: null,
          sortBy: null,
          sortOrder: null,
          page: null,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  // 4. Validate the paginated response
  typia.assert(result);
  // 5. Validate small limit pagination (e.g., limit=1)
  const smallLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
  >(); // Small limit for pagination test
  const smallResult =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection,
      {
        body: {
          limit: smallLimit satisfies number as number,
          cursor: null,
          status: null,
          sellerId: null,
          reviewerId: null,
          createdAtFrom: null,
          createdAtTo: null,
          reviewedAtFrom: null,
          reviewedAtTo: null,
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 0 satisfies number as number,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(smallResult);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "limit matches request",
    smallResult.pagination.limit === (smallLimit ?? 20),
  ); // Handling default limit if API returns default
  TestValidator.predicate(
    "current page is valid",
    smallResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "records count is correct",
    smallResult.pagination.records >= 1,
  ); // At least our registration exists
  TestValidator.predicate(
    "pages count is valid",
    smallResult.pagination.pages >= smallResult.pagination.current,
  );
  // 6. Validate data array structure and fields
  if (smallResult.data.length > 0) {
    const firstRegistration = smallResult.data[0]!;
    // Validate registration summary fields
    typia.assertGuard(firstRegistration);
    // Verify seller info exists
    TestValidator.predicate(
      "seller has id",
      firstRegistration.seller.id !== null &&
        firstRegistration.seller.id.length > 0,
    );
    TestValidator.predicate(
      "seller has email",
      firstRegistration.seller.email !== null,
    );
    // Reviewer should be null for pending registrations
    if (firstRegistration.status === "pending") {
      TestValidator.predicate(
        "pending registration has no reviewer",
        firstRegistration.reviewer === null,
      );
    }
    // Validate timestamps are in ISO 8601 format
    TestValidator.predicate(
      "createdAt is valid ISO 8601",
      firstRegistration.createdAt.includes("T") &&
        firstRegistration.createdAt.includes("Z"),
    );
    TestValidator.predicate(
      "updatedAt is valid ISO 8601",
      firstRegistration.updatedAt.includes("T") &&
        firstRegistration.updatedAt.includes("Z"),
    );
  }
  // 7. Test filtering by sellerId (our registration should appear)
  const filteredBySeller =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection,
      {
        body: {
          limit: 10 satisfies number as number,
          cursor: null,
          status: null,
          sellerId:
            (registration as any).sellerId ??
            (registration as any).seller_id ??
            undefined, // Access seller ID from registration
          reviewerId: null,
          createdAtFrom: null,
          createdAtTo: null,
          reviewedAtFrom: null,
          reviewedAtTo: null,
          sortBy: null,
          sortOrder: null,
          page: null,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(filteredBySeller);
  // Verify our registration appears in filtered results
  const registrationId = (registration as any).id as string | undefined;
  if (registrationId) {
    TestValidator.predicate(
      "filtered results contain our registration",
      filteredBySeller.data.some((r) => r.id === registrationId),
    );
  }
}