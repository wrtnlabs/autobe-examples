import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministratorRequest";
import type { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_request_review_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as super administrator using the provided utility function
  const superAdminAuthResult = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<100>
        >(),
      } satisfies IEconomicDiscussionSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuthResult);
  // Step 3: Create a list of pending administrator requests with different timestamps
  const requestCount = 5;
  const createdRequests: IEconomicDiscussionAdministratorRequest.ISummary[] =
    [];
  // Create requests with varying timestamps (order matters for sorting validation)
  for (let i = 0; i < requestCount; i++) {
    // Create timestamp for each request with different time (oldest to newest for testing sort)
    const oneDayInSeconds = 24 * 60 * 60 * 1000;
    const timestamp = new Date(
      Date.now() - (requestCount - i) * oneDayInSeconds,
    ).toISOString();
    // Create a request with a specific timestamp
    // Using the utility function to create the request data
    const request: IEconomicDiscussionAdministratorRequest.ISummary = {
      id: typia.random<string & tags.Format<"uuid">>(),
      user_id: typia.random<string & tags.Format<"uuid">>(),
      reason: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 5,
        wordMax: 15,
      }),
      submitted_at: timestamp,
      status: "pending",
    };
    createdRequests.push(request);
  }
  // Step 4: Prepare request body with filtering parameters for historian review
  // Validating that we can query by date range
  const startDate = new Date(
    Date.now() - (requestCount - 1) * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const requestBody: IEconomicDiscussionAdministratorRequest.IRequest = {
    status: "pending",
    from: startDate,
    to: endDate,
  } satisfies IEconomicDiscussionAdministratorRequest.IRequest;
  // Step 5: Call the administrator request review endpoint with super administrator connection
  const result: IPageIEconomicDiscussionAdministratorRequest.ISummary =
    await api.functional.economicDiscussion.superAdministrator.administrator_requests.index(
      superAdminConnection, // Use superAdminConnection, NOT base connection
      {
        body: requestBody,
      },
    );
  typia.assert(result);
  // Step 6: Validate the response structure and pagination
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is at least 1",
    () => result.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records matches expected",
    () => result.pagination.records === createdRequests.length,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    () =>
      result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // Step 7: Validate the data array contains the expected number of requests
  TestValidator.equals(
    "all pending requests are returned",
    result.data.length,
    createdRequests.length,
  );
  // Step 8: Validate that the returned requests match our created ones and are sorted chronologically
  // (oldest first, as specified in requirements)
  for (let i = 0; i < result.data.length; i++) {
    // Validate correct ID
    TestValidator.equals(
      `request ${i} id matches`,
      result.data[i].id,
      createdRequests[i].id,
    );
    // Validate correct user_id
    TestValidator.equals(
      `request ${i} user_id matches`,
      result.data[i].user_id,
      createdRequests[i].user_id,
    );
    // Validate correct reason
    TestValidator.equals(
      `request ${i} reason matches`,
      result.data[i].reason,
      createdRequests[i].reason,
    );
    // Validate submitted_at (oldest first)
    TestValidator.equals(
      `request ${i} submitted_at matches`,
      result.data[i].submitted_at,
      createdRequests[i].submitted_at,
    );
    // Validate status is always pending (per API specification)
    TestValidator.equals(
      `request ${i} status is pending`,
      result.data[i].status,
      "pending",
    );
    // Verify chronological order: submitted_at must be in ascending order (oldest to newest)
    if (i > 0) {
      const currentTimestamp = new Date(result.data[i].submitted_at).getTime();
      const previousTimestamp = new Date(
        result.data[i - 1].submitted_at,
      ).getTime();
      TestValidator.predicate(
        `request ${i} sorted chronologically`,
        () => currentTimestamp >= previousTimestamp,
      );
    }
  }
  // Step 9: Validate that the filter by date range works correctly
  // The createdRequests are all between startDate and endDate, so they all should be returned
  // This confirms the date range filtering works as intended
  const requestsInDateRange = createdRequests.filter(
    (r) =>
      new Date(r.submitted_at).getTime() >= new Date(startDate).getTime() &&
      new Date(r.submitted_at).getTime() <= new Date(endDate).getTime(),
  );
  TestValidator.equals(
    "date range filter works",
    requestsInDateRange.length,
    result.data.length,
  );
  // Step 10: Verify that only status 'pending' is returned (API enforces this)
  // Since the API hard-codes this filter, we only need to verify all returned status are "pending"
  const allPending = result.data.every((r) => r.status === "pending");
  TestValidator.predicate("only pending requests returned", () => allPending);
}
