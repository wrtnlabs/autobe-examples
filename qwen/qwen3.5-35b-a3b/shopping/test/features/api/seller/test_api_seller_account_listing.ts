import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the primary success path of listing seller accounts on the platform.
 *
 * Validates the complete seller listing flow including administrative access, pagination metadata accuracy, and response structure verification. Ensures that the seller list correctly returns paginated seller summaries with proper metadata and required fields.
 *
 * Special attention is given to verifying that pagination metadata accurately reflects the result set and that all required seller summary fields are present in each record.
 *
 * 1. Administrator authenticates and accesses seller listing endpoint.
 * 2. Seller list is requested with default pagination parameters (page 1, limit 10).
 * 3. Pagination metadata is validated including records, pages, current, and limit.
 * 4. Each seller summary is validated for required fields and data types.
 * 5. Different page sizes (10, 50, 100) are tested to verify pagination limits.
 * 6. Default sorting by created_at DESC is verified.
 */
export async function test_api_seller_account_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Test default listing (page 1, limit 10)
  const defaultLimit = 10;
  const defaultPage = 1;
  const defaultResponse = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        page: defaultPage,
        limit: defaultLimit,
      },
    },
  );
  typia.assert(defaultResponse);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    defaultResponse.pagination.current,
    defaultPage,
  );
  TestValidator.equals(
    "pagination limit",
    defaultResponse.pagination.limit,
    defaultLimit,
  );
  TestValidator.predicate(
    "pagination records positive",
    defaultResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages positive",
    defaultResponse.pagination.pages > 0,
  );
  // Verify records count matches data array length
  TestValidator.equals(
    "records count matches data length",
    defaultResponse.pagination.records,
    defaultResponse.data.length,
  );
  // 4. Validate seller summary structure
  for (const seller of defaultResponse.data) {
    typia.assert(seller);
    // Verify required fields with proper types
    TestValidator.predicate("seller id is UUID", seller.id.length === 36);
    TestValidator.predicate(
      "seller display name exists",
      seller.display_name.length > 0,
    );
    TestValidator.predicate(
      "seller approval_status is valid",
      ["pending", "approved", "rejected"].includes(seller.approval_status),
    );
    TestValidator.predicate(
      "seller is_suspended is boolean",
      typeof seller.is_suspended === "boolean",
    );
    TestValidator.predicate(
      "seller created_at is timestamp",
      seller.created_at !== undefined,
    );
    // Validate optional fields when present
    if (seller.email !== undefined && seller.email !== null) {
      TestValidator.predicate(
        "email field is valid",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(seller.email),
      );
    }
    if (seller.rejection_reason !== undefined) {
      // Can be string or null
      if (seller.rejection_reason !== null) {
        TestValidator.predicate(
          "rejection_reason is non-empty string",
          seller.rejection_reason.length > 0,
        );
      }
    }
    if (seller.deleted_at !== undefined) {
      // Can be date-time string or null
      if (seller.deleted_at !== null) {
        TestValidator.predicate(
          "deleted_at is valid date-time",
          seller.deleted_at !== undefined,
        );
      }
    }
    if (seller.updated_at !== undefined) {
      TestValidator.predicate(
        "updated_at is valid date-time",
        seller.updated_at !== undefined,
      );
    }
  }
  // 5. Test different page sizes
  const pageSizes = [10, 50, 100];
  for (const pageSize of pageSizes) {
    const response = await api.functional.ecommerceMall.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: pageSize,
        },
      },
    );
    typia.assert(response);
    TestValidator.equals(
      `pagination limit for size ${pageSize}`,
      response.pagination.limit,
      pageSize,
    );
    TestValidator.predicate(
      `data length does not exceed limit ${pageSize}`,
      response.data.length <= pageSize,
    );
  }
  // 6. Verify default sorting (newest first by created_at DESC)
  if (defaultResponse.data.length > 1) {
    for (let i = 0; i < defaultResponse.data.length - 1; i++) {
      const currentSeller = defaultResponse.data[i];
      const nextSeller = defaultResponse.data[i + 1];
      // If timestamps differ, current should be newer or equal (descending order)
      if (currentSeller.created_at !== nextSeller.created_at) {
        TestValidator.predicate(
          "sellers sorted by created_at DESC",
          new Date(currentSeller.created_at) >= new Date(nextSeller.created_at),
        );
      }
    }
  }
}
