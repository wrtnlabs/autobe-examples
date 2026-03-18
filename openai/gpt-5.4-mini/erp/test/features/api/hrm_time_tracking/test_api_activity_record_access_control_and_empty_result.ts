import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingActivityRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityRecord";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingActivityRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityRecord";
import type { IPageIHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_record_access_control_and_empty_result(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const password = `${RandomGenerator.alphaNumeric(12)}A1!`;
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const accessDeniedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  await TestValidator.httpError(
    "member without organization-management visibility should be rejected from activity records listing",
    [401, 403],
    async () => {
      await api.functional.hrmTimeTracking.member.hrmTimeTracking.activity_records.index(
        accessDeniedConnection,
        {
          body: {
            page: 1,
            limit: 10,
            sort: "createdAtDesc",
            details: RandomGenerator.alphabets(24),
          } satisfies IHrmTimeTrackingActivityRecord.IRequest,
        },
      );
    },
  );
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const emptyPage =
    await api.functional.hrmTimeTracking.member.hrmTimeTracking.activity_records.index(
      authorizedConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "createdAtDesc",
          details: `no-match-${RandomGenerator.alphabets(18)}`,
          actionType: `no-match-${RandomGenerator.alphabets(12)}`,
          targetEntityType: `no-match-${RandomGenerator.alphabets(12)}`,
        } satisfies IHrmTimeTrackingActivityRecord.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty activity record page should have zero data",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty activity record page should have zero records",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty activity record page should have zero pages",
    emptyPage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty activity record page should keep requested current page",
    emptyPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty activity record page should keep requested limit",
    emptyPage.pagination.limit,
    10,
  );
}
