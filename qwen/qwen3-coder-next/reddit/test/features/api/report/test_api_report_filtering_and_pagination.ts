import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(1),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Test report filtering and pagination with various status values
  const filterRequestBody: IRedditPlatformReport.IRequest = {
    status: "PENDING",
    reportedType: "POST",
    page: 1,
    pageSize: 10,
    sortBy: "created_at",
    sortOrder: "DESC",
  };
  const filteredResult =
    await api.functional.redditPlatform.member.redditPlatform.reports.index(
      memberConnection,
      { body: filterRequestBody },
    );
  typia.assert(filteredResult);
  // 3. Validate filtering functionality
  TestValidator.equals(
    "filtered result has correct status",
    filteredResult.data[0]?.status,
    "PENDING",
  );
  TestValidator.equals(
    "pagination exists",
    filteredResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has pagination records",
    filteredResult.pagination.records >= 0,
  );
  // 4. Test pagination with different page sizes
  const pageSize2Request: IRedditPlatformReport.IRequest = {
    status: "APPROVED",
    page: 1,
    pageSize: 5,
  };
  const pageSize2Result =
    await api.functional.redditPlatform.member.redditPlatform.reports.index(
      memberConnection,
      { body: pageSize2Request },
    );
  typia.assert(pageSize2Result);
  TestValidator.equals(
    "page size 5 respected",
    pageSize2Result.pagination.limit,
    5,
  );
  // 5. Test filtering by DISMISSED status
  const dismissedRequest: IRedditPlatformReport.IRequest = {
    status: "DISMISSED",
    page: 1,
    pageSize: 20,
  };
  const dismissedResult =
    await api.functional.redditPlatform.member.redditPlatform.reports.index(
      memberConnection,
      { body: dismissedRequest },
    );
  typia.assert(dismissedResult);
  // 6. Test filtering without status (all reports)
  const allReportsRequest: IRedditPlatformReport.IRequest = {
    page: 1,
    pageSize: 10,
  };
  const allReportsResult =
    await api.functional.redditPlatform.member.redditPlatform.reports.index(
      memberConnection,
      { body: allReportsRequest },
    );
  typia.assert(allReportsResult);
}
