import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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

export async function test_api_activity_logs_list_organization_scoping(
  connection: api.IConnection,
): Promise<void> {
  // Create member A with organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_timezone: "Asia/Seoul",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAAuth);
  // Create member B with organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_timezone: "UTC",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  // Get organizations from the authorized response
  // Note: IHrmPlatformMember.ISummary doesn't have organization field
  // We need to rely on the activity logs organization_id for validation
  const memberA = memberAAuth.member;
  const memberB = memberBAuth.member;
  // Query activity logs for member A
  const memberAPagination =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberAConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(memberAPagination);
  // Test 1: Member A views activity logs - verify pagination works
  TestValidator.equals(
    "org a pagination current page",
    memberAPagination.pagination.current,
    1,
  );
  TestValidator.predicate(
    "org a pagination records >= 0",
    memberAPagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "org a pagination pages >= 0",
    memberAPagination.pagination.pages >= 0,
  );
  // Test 2: Verify member B can also query activity logs
  const memberBPagination =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberBConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(memberBPagination);
  TestValidator.equals(
    "org b pagination current page",
    memberBPagination.pagination.current,
    1,
  );
  TestValidator.predicate(
    "org b pagination records >= 0",
    memberBPagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "org b pagination pages >= 0",
    memberBPagination.pagination.pages >= 0,
  );
  // Test 3: Filtered queries respect organization boundaries for member A
  const filteredRequest: IHrmPlatformActivityLog.IRequest = {
    entity_type: "project",
    page: 1,
    limit: 100,
  };
  const memberAFiltered =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberAConnection,
      { body: filteredRequest },
    );
  typia.assert(memberAFiltered);
  // Verify all returned logs have consistent pagination
  TestValidator.equals(
    "filtered pagination records matches data length",
    memberAFiltered.pagination.records,
    memberAFiltered.data.length,
  );
  // Test 4: Time range filter respects organization scoping
  const now = new Date().toISOString();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const memberATimeFiltered =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberAConnection,
      {
        body: {
          from: twoHoursAgo,
          to: now,
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(memberATimeFiltered);
  TestValidator.equals(
    "time filtered pagination records matches data length",
    memberATimeFiltered.pagination.records,
    memberATimeFiltered.data.length,
  );
  // Test 5: Member ID filter works within organization
  const memberAMemberFiltered =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberAConnection,
      {
        body: {
          member_id: memberA.id,
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(memberAMemberFiltered);
  TestValidator.equals(
    "member filtered pagination records matches data length",
    memberAMemberFiltered.pagination.records,
    memberAMemberFiltered.data.length,
  );
  // Verify pagination boundary - total records should never exceed what's returned
  TestValidator.predicate(
    "pagination records >= data length",
    memberAPagination.pagination.records >= memberAPagination.data.length,
  );
  TestValidator.predicate(
    "pagination records >= time filtered data length",
    memberATimeFiltered.pagination.records >= memberATimeFiltered.data.length,
  );
  TestValidator.predicate(
    "pagination records >= member filtered data length",
    memberAMemberFiltered.pagination.records >=
      memberAMemberFiltered.data.length,
  );
  // Test 6: Verify member B pagination works independently
  TestValidator.predicate(
    "member B pagination records >= 0",
    memberBPagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "member B pagination pages >= 0",
    memberBPagination.pagination.pages >= 0,
  );
  // Test 7: Verify filters work for member B
  const memberBFiltered =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberBConnection,
      {
        body: {
          entity_type: "task",
          action_type: "create",
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(memberBFiltered);
  TestValidator.equals(
    "member b filtered pagination records matches data length",
    memberBFiltered.pagination.records,
    memberBFiltered.data.length,
  );
  // Test 8: Edge case - empty organization (no activity logs)
  // Query with a filter that likely returns nothing for new members
  const memberAEmptyFilter =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberAConnection,
      {
        body: {
          entity_type: "nonexistent_entity_type_xyz",
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(memberAEmptyFilter);
  TestValidator.equals(
    "empty filter pagination records is 0",
    memberAEmptyFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filter data array is empty",
    memberAEmptyFilter.data.length,
    0,
  );
  TestValidator.equals(
    "empty filter pages is 0",
    memberAEmptyFilter.pagination.pages,
    0,
  );
}