import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingActivityRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityRecord";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_record_get_by_organization_context(
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
  const activityRecord =
    await api.functional.hrmTimeTracking.member.activity_records.at(
      memberConnection,
      {
        activityRecordId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(activityRecord);
  TestValidator.predicate(
    "activity record organization summary exists",
    activityRecord.organization.id.length > 0 &&
      activityRecord.organization.name.length > 0,
  );
  TestValidator.predicate(
    "activity record action metadata exists",
    activityRecord.actionType.length > 0 &&
      activityRecord.targetEntityType.length > 0,
  );
  TestValidator.predicate(
    "activity record details exist",
    activityRecord.details.length > 0 && activityRecord.createdAt.length > 0,
  );
}
