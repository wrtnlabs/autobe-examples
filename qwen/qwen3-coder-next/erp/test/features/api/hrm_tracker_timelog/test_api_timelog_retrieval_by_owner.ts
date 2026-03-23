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

export async function test_api_timelog_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Create timelog with a generated project ID
  // Since there's no project creation API, we'll use a generated UUID
  // In a real scenario, this would reference an existing project
  const timelog = await api.functional.hrmTracker.member.timelogs.create(
    memberConnection,
    {
      body: {
        date: new Date().toISOString(),
        duration_in_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        project_id: typia.random<string & tags.Format<"uuid">>(),
        task_id: undefined,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IHrmTrackerTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 3. Retrieve timelog by ID
  const retrievedTimelog = await api.functional.hrmTracker.member.timelogs.at(
    memberConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // 4. Validate response
  TestValidator.equals("timelog ID matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals(
    "employee_id matches",
    retrievedTimelog.employee_id,
    member.id,
  );
  TestValidator.predicate(
    "has valid duration",
    retrievedTimelog.duration_in_minutes > 0,
  );
  TestValidator.predicate("has valid date", retrievedTimelog.date !== null);
  TestValidator.predicate(
    "has billable field",
    typeof retrievedTimelog.billable === "boolean",
  );
}
