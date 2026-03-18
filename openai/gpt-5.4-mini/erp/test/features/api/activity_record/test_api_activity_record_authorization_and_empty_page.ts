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

export async function test_api_activity_record_authorization_and_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await api.functional.hrmTimeTracking.auth.member.join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IHrmTimeTrackingMember.IJoin,
    },
  );
  typia.assert(owner);
  const organization =
    await api.functional.hrmTimeTracking.member.organizations.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.hrmTimeTracking.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IHrmTimeTrackingMember.IJoin,
    },
  );
  typia.assert(member);
  await TestValidator.httpError(
    "member without org-management permission should be denied",
    [401, 403],
    async () => {
      await api.functional.hrmTimeTracking.member.activity_records.index(
        memberConnection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IHrmTimeTrackingActivityRecord.IRequest,
        },
      );
    },
  );
  const authorizedConnection: api.IConnection = { host: connection.host };
  await api.functional.hrmTimeTracking.auth.member.join(authorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const emptyPage =
    await api.functional.hrmTimeTracking.member.activity_records.index(
      authorizedConnection,
      {
        body: {
          page: 1,
          limit: 10,
          actionType: "__no_such_action_type__",
          targetEntityType: "__no_such_target_entity_type__",
          details: "__no_such_activity_details__",
          createdAtFrom: new Date("2000-01-01T00:00:00.000Z").toISOString(),
          createdAtTo: new Date("2000-01-02T00:00:00.000Z").toISOString(),
        } satisfies IHrmTimeTrackingActivityRecord.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page data", emptyPage.data.length, 0);
  TestValidator.equals("empty page current", emptyPage.pagination.current, 1);
  TestValidator.equals("empty page limit", emptyPage.pagination.limit, 10);
  TestValidator.equals("empty page records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty page pages", emptyPage.pagination.pages, 0);
}
