import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformReportOfGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportOfGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportOfGuest";
import { prepare_random_community_platform_report_of_guest } from "../../../prepare/prepare_random_community_platform_report_of_guest";
import { generate_random_community_platform_report_of_guests_create } from "../../../generate/generate_random_community_platform_report_of_guests_create";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_report_retrieval_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // Authenticate guest user
  const guestAuth: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformGuest.IJoin,
    });
  typia.assert(guestAuth);
  // Step 2: Create a guest report with reason 'spam'
  const createdReport =
    await generate_random_community_platform_report_of_guests_create(
      guestConnection,
      {
        body: {
          guest_session_id: guestAuth.id,
          report_reason: "spam",
        } satisfies ICommunityPlatformReportOfGuest.ICreate,
      },
    );
  typia.assert(createdReport);
  // Step 3: Prepare search criteria for retrieving reports with status 'pending' and reason 'spam'
  // We cannot use reportedContentId because we don't know its value yet and it's not part of the creation response
  const searchCriteria: ICommunityPlatformReportOfGuest.IRequest = {
    status: "pending",
    reportReason: "spam",
    reportedContentId: "", // This field is required but we cannot know its value, so we set empty string
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    limit: 100, // Use large limit to find the created report
  } satisfies ICommunityPlatformReportOfGuest.IRequest;
  // Step 4: Retrieve guest reports using the search criteria
  const result: IPageICommunityPlatformReportOfGuest.ISummary =
    await api.functional.communityPlatform.guest.report.of.guests.index(
      guestConnection,
      {
        body: searchCriteria,
      },
    );
  typia.assert(result);
  // Step 5: Validate response structure and content
  // Validate pagination
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 100);
  TestValidator.predicate(
    "pagination records >= 1",
    result.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    result.pagination.pages >= 1,
  );
  // Validate data array has at least one item (should contain our created report)
  TestValidator.predicate(
    "data array has at least one item",
    result.data.length >= 1,
  );
  // Validate that all returned reports match the search criteria (status 'pending' and reason 'spam')
  result.data.forEach((report) => {
    TestValidator.equals("report status is pending", report.status, "pending");
    TestValidator.equals("report reason is spam", report.report_reason, "spam");
  });
  // Validate that all returned items are within the specified pagination limit (at most 100)
  TestValidator.predicate(
    "number of items returned is at most 100",
    result.data.length <= 100,
  );
}
