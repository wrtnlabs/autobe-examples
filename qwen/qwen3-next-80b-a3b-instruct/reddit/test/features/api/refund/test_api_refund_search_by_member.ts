import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRefund";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSaleRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSaleRefund";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_refund_search_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberCredentials });
  // Step 2: Validate search functionality with valid parameters
  // Search with minimum required parameters - page and limit, since we cannot create data
  const searchResponse: IPageICommunityPlatformSaleRefund.ISummary =
    await api.functional.communityPlatform.salesrefunds.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformRefund.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Validate response structure matches the contract
  TestValidator.predicate(
    "response has pagination object",
    searchResponse.pagination !== undefined &&
      typeof searchResponse.pagination === "object",
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(searchResponse.data),
  );
  // Validate pagination structure
  TestValidator.predicate(
    "pagination current is positive",
    searchResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    searchResponse.pagination.limit > 0 &&
      searchResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    searchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    searchResponse.pagination.pages >= 0,
  );
  // Test with maximum limit
  const maxLimitResponse: IPageICommunityPlatformSaleRefund.ISummary =
    await api.functional.communityPlatform.salesrefunds.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformRefund.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit is 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  // Test with sorting parameters
  const sortByResponse: IPageICommunityPlatformSaleRefund.ISummary =
    await api.functional.communityPlatform.salesrefunds.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sortBy: "requestDate",
          sortOrder: "asc",
        } satisfies ICommunityPlatformRefund.IRequest,
      },
    );
  typia.assert(sortByResponse);
  // Test search with status filter
  const statusResponse: IPageICommunityPlatformSaleRefund.ISummary =
    await api.functional.communityPlatform.salesrefunds.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
          status: "pending",
        } satisfies ICommunityPlatformRefund.IRequest,
      },
    );
  typia.assert(statusResponse);
  // Test search with date range (valid ISO strings)
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dateRangeResponse: IPageICommunityPlatformSaleRefund.ISummary =
    await api.functional.communityPlatform.salesrefunds.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
          startDate: yesterday,
          endDate: today,
        } satisfies ICommunityPlatformRefund.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Test search with saleId filter
  const validUuid = typia.random<string & tags.Format<"uuid">>();
  const saleIdResponse: IPageICommunityPlatformSaleRefund.ISummary =
    await api.functional.communityPlatform.salesrefunds.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
          saleId: validUuid,
        } satisfies ICommunityPlatformRefund.IRequest,
      },
    );
  typia.assert(saleIdResponse);
  // Test error conditions - invalid page
  await TestValidator.error("invalid page should fail", async () => {
    await api.functional.communityPlatform.salesrefunds.index(
      memberConnection,
      {
        body: {
          page: 0, // Invalid - must be >= 1
          limit: 5,
        } satisfies ICommunityPlatformRefund.IRequest,
      },
    );
  });
  // Test error conditions - invalid limit
  await TestValidator.error("invalid limit should fail", async () => {
    await api.functional.communityPlatform.salesrefunds.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 0, // Invalid - must be >= 1
        } satisfies ICommunityPlatformRefund.IRequest,
      },
    );
  });
  // Test error conditions - invalid limit (too high)
  await TestValidator.error("excessive limit should fail", async () => {
    await api.functional.communityPlatform.salesrefunds.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 101, // Invalid - must be <= 100
        } satisfies ICommunityPlatformRefund.IRequest,
      },
    );
  });
  // Test error conditions - invalid sort field
  await TestValidator.error("invalid sortBy should fail", async () => {
    await api.functional.communityPlatform.salesrefunds.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sortBy: "invalid_field" as any,
        } satisfies ICommunityPlatformRefund.IRequest,
      },
    );
  });
  // Test error conditions - invalid sort order
  await TestValidator.error("invalid sortOrder should fail", async () => {
    await api.functional.communityPlatform.salesrefunds.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sortOrder: "invalid_order" as any,
        } satisfies ICommunityPlatformRefund.IRequest,
      },
    );
  });
  // Test error conditions - invalid date format
  await TestValidator.error("invalid startDate should fail", async () => {
    await api.functional.communityPlatform.salesrefunds.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
          startDate: "invalid-date",
        } satisfies ICommunityPlatformRefund.IRequest,
      },
    );
  });
  // For status, we can only test the enum values are accepted or rejected by the API
  // We test an invalid status value
  await TestValidator.error("invalid status should fail", async () => {
    await api.functional.communityPlatform.salesrefunds.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
          status: "invalid_status" as any,
        } satisfies ICommunityPlatformRefund.IRequest,
      },
    );
  });
}
