import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
@Test pagination functionality for refund request snapshots with extensive modification history.
*/
export async function test_api_refund_request_snapshots_pagination_large_history(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Get a refund request ID (in real scenario this would come from existing data)
  // For testing purposes, we'll use a random UUID
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  // Test pagination with different parameters
  const testCases = [
    {
      page: 1,
      limit: 10,
      sort_by: "created_at" as const,
      sort_order: "desc" as const,
    },
    {
      page: 2,
      limit: 5,
      sort_by: "created_at" as const,
      sort_order: "desc" as const,
    },
    {
      page: 1,
      limit: 100,
      sort_by: "created_at" as const,
      sort_order: "desc" as const,
    },
    {
      page: 999,
      limit: 10,
      sort_by: "created_at" as const,
      sort_order: "desc" as const,
    }, // beyond available data
    {
      page: 1,
      limit: 1,
      sort_by: "created_at" as const,
      sort_order: "desc" as const,
    }, // single result page
  ];
  for (const testCase of testCases) {
    const response =
      await api.functional.ecommerce.administrator.refund_requests.snapshots.index(
        adminConnection,
        {
          refundRequestId,
          body: testCase satisfies IEcommerceRefundRequestSnapshot.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.predicate(
      `pagination metadata exists for page ${testCase.page}, limit ${testCase.limit}`,
      response.pagination !== undefined,
    );
    // Validate pagination structure
    TestValidator.equals(
      `current page matches request for page ${testCase.page}`,
      response.pagination.current,
      testCase.page,
    );
    TestValidator.equals(
      `limit matches request for page ${testCase.page}`,
      response.pagination.limit,
      testCase.limit,
    );
    // Validate data structure
    TestValidator.predicate(
      `data is an array for page ${testCase.page}`,
      Array.isArray(response.data),
    );
    // Validate snapshot ordering (created_at descending)
    if (response.data.length > 1) {
      for (let i = 0; i < response.data.length - 1; i++) {
        TestValidator.predicate(
          `snapshot chronological order maintained at index ${i} for page ${testCase.page}`,
          new Date(response.data[i].created_at) >=
            new Date(response.data[i + 1].created_at),
        );
      }
    }
    // Validate snapshot summary structure for each item
    for (const snapshot of response.data) {
      typia.assert(snapshot);
      TestValidator.predicate(
        `snapshot has valid ID for page ${testCase.page}`,
        typeof snapshot.id === "string" && snapshot.id.length > 0,
      );
      TestValidator.predicate(
        `snapshot has creation timestamp for page ${testCase.page}`,
        typeof snapshot.created_at === "string" &&
          snapshot.created_at.length > 0,
      );
      TestValidator.predicate(
        `snapshot has change description for page ${testCase.page}`,
        typeof snapshot.change_description === "string",
      );
    }
  }
  // Test edge case: limit boundaries
  const boundaryCases = [
    { limit: 1 }, // minimum limit
    { limit: 100 }, // maximum limit
  ];
  for (const boundaryCase of boundaryCases) {
    const response =
      await api.functional.ecommerce.administrator.refund_requests.snapshots.index(
        adminConnection,
        {
          refundRequestId,
          body: {
            page: 1,
            limit: boundaryCase.limit,
            sort_by: "created_at" as const,
            sort_order: "desc" as const,
          } satisfies IEcommerceRefundRequestSnapshot.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      `limit boundary ${boundaryCase.limit} is respected`,
      response.data.length <= boundaryCase.limit,
    );
  }
}
