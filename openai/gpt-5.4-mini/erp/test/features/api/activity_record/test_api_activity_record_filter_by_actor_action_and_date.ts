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

export async function test_api_activity_record_filter_by_actor_action_and_date(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `${RandomGenerator.name(2)}-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const from = new Date(Date.now() - 1000 * 60 * 60 * 24);
  const to = new Date(Date.now() + 1000 * 60 * 60 * 24);
  const request = {
    page: 1,
    limit: 20,
    sort: "createdAtDesc",
    memberId: authorized.id,
    createdAtFrom: from.toISOString(),
    createdAtTo: to.toISOString(),
  } satisfies IHrmTimeTrackingActivityRecord.IRequest;
  const page =
    await api.functional.hrmTimeTracking.member.activity_records.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "pagination current should match the request",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit should match the request",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "pagination record count should match returned rows",
    page.pagination.records,
    page.data.length,
  );
  TestValidator.equals(
    "pagination page count should be consistent",
    page.pagination.pages,
    page.pagination.records === 0
      ? 0
      : Math.ceil(page.pagination.records / page.pagination.limit),
  );
  for (const record of page.data) {
    TestValidator.equals(
      "activity record organization should match the created organization",
      record.organization.id,
      organization.id,
    );
    TestValidator.predicate(
      "activity record should have the requested actor when present",
      () => record.member === null || record.member.id === authorized.id,
    );
    TestValidator.predicate(
      "activity record should fall inside the requested time range",
      () => {
        const createdAt = new Date(record.createdAt).getTime();
        return createdAt >= from.getTime() && createdAt <= to.getTime();
      },
    );
  }
}
