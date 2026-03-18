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

export async function test_api_activity_record_list_recent_history(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `${RandomGenerator.name()} ${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const page =
    await api.functional.hrmTimeTracking.member.activity_records.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "createdAtDesc",
        } satisfies IHrmTimeTrackingActivityRecord.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(page.data));
  if (page.data.length > 1) {
    for (let i = 1; i < page.data.length; i++) {
      TestValidator.predicate(
        "results are sorted by createdAt descending",
        page.data[i - 1].createdAt >= page.data[i].createdAt,
      );
    }
  }
  for (const record of page.data) {
    TestValidator.equals(
      "organization id is scoped to the active organization",
      record.organization.id,
      organization.id,
    );
    TestValidator.equals(
      "organization summary name matches",
      record.organization.name,
      organization.name,
    );
    TestValidator.predicate(
      "actionType is present",
      record.actionType.length > 0,
    );
    TestValidator.predicate(
      "targetEntityType is present",
      record.targetEntityType.length > 0,
    );
    TestValidator.predicate("details are present", record.details.length > 0);
    TestValidator.predicate(
      "createdAt is present",
      record.createdAt.length > 0,
    );
    if (record.member !== null) {
      TestValidator.predicate(
        "member id is present",
        record.member.id.length > 0,
      );
      TestValidator.predicate(
        "member email is present",
        record.member.email.length > 0,
      );
    }
  }
  const filtered =
    await api.functional.hrmTimeTracking.member.activity_records.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 1,
          sort: "idDesc",
          actionType: RandomGenerator.alphabets(12),
        } satisfies IHrmTimeTrackingActivityRecord.IRequest,
      },
    );
  typia.assert(filtered);
  TestValidator.equals(
    "filtered pagination current",
    filtered.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered pagination limit",
    filtered.pagination.limit,
    1,
  );
}
