import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test activity log retrieval with pagination for authenticated members.
 *
 * Validates the complete activity log query flow including member authentication, pagination parameter handling, and response structure validation. Ensures that activity logs are correctly returned with proper pagination metadata and that each log entry contains all required fields.
 *
 * Special attention is given to verifying pagination works correctly across multiple pages with different limit values, and that all activity log entries contain the required identification and contextual information including member and organization references.
 *
 * 1. Member registers and authenticates to obtain access token.
 * 2. Query activity logs with default pagination (page 1, limit 20).
 * 3. Validate response structure including pagination metadata and data array.
 * 4. Verify each activity log entry contains required fields through typia assertion.
 * 5. Test pagination with different page numbers and limit values.
 * 6. Validate pagination metadata consistency across different queries.
 */
export async function test_api_activity_log_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Query activity logs with default pagination
  const defaultResponse =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // 3. Validate pagination metadata structure
  TestValidator.equals("current page", defaultResponse.pagination.current, 1);
  TestValidator.equals("default limit", defaultResponse.pagination.limit, 20);
  TestValidator.predicate(
    "records count non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate(
    "data array exists",
    Array.isArray(defaultResponse.data),
  );
  // 5. Test pagination with different limit values
  const limit10Response =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(limit10Response);
  TestValidator.equals(
    "limit 10 respected",
    limit10Response.pagination.limit,
    10,
  );
  const limit50Response =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(limit50Response);
  TestValidator.equals(
    "limit 50 respected",
    limit50Response.pagination.limit,
    50,
  );
  // 6. Test pagination with different page numbers
  const page2Response =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 2 requested", page2Response.pagination.current, 2);
  // 7. Validate pagination metadata consistency
  TestValidator.predicate(
    "pages calculation consistent",
    defaultResponse.pagination.pages ===
      Math.ceil(
        defaultResponse.pagination.records / defaultResponse.pagination.limit,
      ),
  );
  // 8. Test with filter parameters (actionType)
  const filteredResponse =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          actionType: "employee:invite",
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(filteredResponse);
}
