import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberEmailVerification";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verifications_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test created_at_from and created_at_to filters
  const testDate = new Date();
  const dateRangeStart = new Date(
    testDate.getTime() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days ago
  const dateRangeEnd = new Date(
    testDate.getTime() + 1000 * 60 * 60 * 24 * 1,
  ).toISOString(); // tomorrow
  const withCreatedRange =
    await api.functional.hrms.member.email_verifications.index(
      memberConnection,
      {
        body: {
          created_at_from: dateRangeStart,
          created_at_to: dateRangeEnd,
        } satisfies IHrmsMemberEmailVerification.IRequest,
      },
    );
  typia.assert(withCreatedRange);
  // 3. Test expires_at_from and expires_at_to filters
  const expiresRangeStart = new Date(
    testDate.getTime() - 1000 * 60 * 60 * 24 * 14,
  ).toISOString(); // 14 days ago
  const expiresRangeEnd = new Date(
    testDate.getTime() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString(); // 30 days from now
  const withExpiresRange =
    await api.functional.hrms.member.email_verifications.index(
      memberConnection,
      {
        body: {
          expires_at_from: expiresRangeStart,
          expires_at_to: expiresRangeEnd,
        } satisfies IHrmsMemberEmailVerification.IRequest,
      },
    );
  typia.assert(withExpiresRange);
  // 4. Test empty results with unrealistic date range
  const pastYearStart = new Date(
    testDate.getTime() - 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year ago
  const pastYearEnd = new Date(
    testDate.getTime() - 1000 * 60 * 60 * 24 * 365 - 1000,
  ).toISOString(); // 1 year ago minus 1 second
  const withNoResults =
    await api.functional.hrms.member.email_verifications.index(
      memberConnection,
      {
        body: {
          created_at_from: pastYearStart,
          created_at_to: pastYearEnd,
        } satisfies IHrmsMemberEmailVerification.IRequest,
      },
    );
  typia.assert(withNoResults);
  // Validate empty results structure
  TestValidator.equals(
    "no results data array is empty",
    withNoResults.data.length,
    0,
  );
  TestValidator.equals(
    "no results pagination records is 0",
    withNoResults.pagination.records,
    0,
  );
  // 5. Test combined filters (status + date range)
  const combinedFilters =
    await api.functional.hrms.member.email_verifications.index(
      memberConnection,
      {
        body: {
          status: "active",
          created_at_from: dateRangeStart,
          created_at_to: dateRangeEnd,
        } satisfies IHrmsMemberEmailVerification.IRequest,
      },
    );
  typia.assert(combinedFilters);
  // Validate pagination metadata for non-empty results
  TestValidator.equals(
    "combined filters pagination current page",
    combinedFilters.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filters pagination limit",
    combinedFilters.pagination.limit,
    20,
  );
  TestValidator.equals(
    "combined filters pagination pages",
    combinedFilters.pagination.pages,
    1,
  );
  // Validate structure of returned records when data exists
  if (combinedFilters.data.length > 0) {
    const firstRecord = combinedFilters.data[0];
    typia.assert(firstRecord);
    TestValidator.equals(
      "record has member_email",
      firstRecord.member_email !== undefined,
      true,
    );
    TestValidator.equals(
      "record has status",
      firstRecord.status !== undefined,
      true,
    );
  }
  // Validate pagination structure for empty results
  TestValidator.equals(
    "empty pagination current page",
    withNoResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty pagination limit",
    withNoResults.pagination.limit,
    20,
  );
  TestValidator.equals(
    "empty pagination pages",
    withNoResults.pagination.pages,
    0,
  );
}
