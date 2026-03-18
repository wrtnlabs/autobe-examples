import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingActivityRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityRecord";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingActivityRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_activity_record_list_organization_scoped(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.hrmTimeTracking.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IHrmTimeTrackingMember.IJoin,
    },
  );
  typia.assert(member);
  const organizationConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      organizationConnection,
      {
        body: {
          name: `activity-${RandomGenerator.alphabets(8)}`,
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const activityPage =
    await api.functional.hrmTimeTracking.member.hrmTimeTracking.activity_records.index(
      organizationConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "createdAtDesc",
        } satisfies IHrmTimeTrackingActivityRecord.IRequest,
      },
    );
  typia.assert(activityPage);
  TestValidator.equals(
    "organization page current",
    activityPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "organization page limit",
    activityPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "organization page records consistent",
    activityPage.pagination.records >= activityPage.data.length,
  );
  TestValidator.predicate(
    "organization page pages consistent",
    activityPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "activity records belong to selected organization",
    activityPage.data.every(
      (record) => record.organization.id === organization.id,
    ),
  );
  TestValidator.predicate(
    "activity records have member summary or null",
    activityPage.data.every(
      (record) => record.member === null || record.member.id === member.id,
    ),
  );
  TestValidator.predicate(
    "activity records are sorted newest first",
    activityPage.data.every(
      (record, index, array) =>
        index === 0 || array[index - 1].createdAt >= record.createdAt,
    ),
  );
  TestValidator.predicate(
    "activity record fields are present",
    activityPage.data.every(
      (record) =>
        typeof record.actionType === "string" &&
        typeof record.targetEntityType === "string" &&
        typeof record.details === "string" &&
        typeof record.createdAt === "string",
    ),
  );
  TestValidator.predicate(
    "activity record target metadata is valid",
    activityPage.data.every(
      (record) =>
        record.targetEntityId === null || record.targetEntityId.length > 0,
    ),
  );
  const defaultPage =
    await api.functional.hrmTimeTracking.member.hrmTimeTracking.activity_records.index(
      organizationConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IHrmTimeTrackingActivityRecord.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page current",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("default page limit", defaultPage.pagination.limit, 1);
  TestValidator.predicate(
    "default page data length bound",
    defaultPage.data.length <= 1,
  );
  if (activityPage.data.length > 0 && defaultPage.data.length > 0) {
    TestValidator.equals(
      "default returns most recent activity first",
      defaultPage.data[0].id,
      activityPage.data[0].id,
    );
  }
}
