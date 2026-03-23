import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import type { IHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_timelogs_create } from "../../../generate/generate_random_hrm_tracker_member_timelogs_create";
import { prepare_random_hrm_tracker_timelog } from "../../../prepare/prepare_random_hrm_tracker_timelog";

export async function test_api_timelog_retrieval_denied_without_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member employee (attempter without time:view_all)
  const attempterConnection: api.IConnection = { host: connection.host };
  const attempter = await authorize_member_join(attempterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(attempter);
  // 2. Create second member employee (owner of the timelog)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(owner);
  // 3. Create timelog for the second member (owner)
  const timelog = await api.functional.hrmTracker.member.timelogs.create(
    ownerConnection,
    {
      body: {
        date: new Date().toISOString(),
        duration_in_minutes: 60,
        project_id: typia.random<string & tags.Format<"uuid">>(),
        task_id: null,
        description: "Test work",
        billable: true,
      } satisfies IHrmTrackerTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 4. Attempt to retrieve the timelog as the first member (without time:view_all)
  // Expected: HTTP 403 Forbidden or 404 Not Found (safe failure)
  await TestValidator.error(
    "should throw HTTP error on unauthorized access",
    async () => {
      await api.functional.hrmTracker.member.timelogs.at(attempterConnection, {
        timelogId: timelog.id,
      });
    },
  );
}
