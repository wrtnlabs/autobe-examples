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

export async function test_api_timelog_retrieval_with_view_all_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member with time:view_all permission (assumes role assignment via backend mock)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@test.com",
      password: "Password123!",
      display_name: "Admin User",
    } satisfies IHrmTrackerMember.IJoin,
  });
  // 2. Join timelog owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMember = await authorize_member_join(ownerConnection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@test.com",
      password: "Password123!",
      display_name: "Owner User",
    } satisfies IHrmTrackerMember.IJoin,
  });
  // 3. Create timelog for owner member (requires organization context)
  const timelog = await generate_random_hrm_tracker_member_timelogs_create(
    ownerConnection,
    {
      body: {
        date: typia.random<string & tags.Format<"date-time">>(),
        duration_in_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1440>
        >(),
        project_id: typia.random<string & tags.Format<"uuid">>(),
        billable: true,
      } satisfies IHrmTrackerTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 4. Authenticate as admin member with time:view_all permission
  const adminViewConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_member_login(adminViewConnection, {
    body: {
      email: adminMember.email,
      password: "Password123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IHrmTrackerMember.ILogin,
  });
  // 5. Retrieve owner member's timelog as admin
  const retrievedTimelog = await api.functional.hrmTracker.member.timelogs.at(
    adminViewConnection,
    {
      timelogId: timelog.id,
    },
  );
  // 6. Validate
  typia.assert(retrievedTimelog);
  TestValidator.equals(
    "timelog belongs to owner",
    retrievedTimelog.employee_id,
    ownerMember.id,
  );
  TestValidator.equals("timelog ID matches", retrievedTimelog.id, timelog.id);
  TestValidator.predicate(
    "has valid duration",
    retrievedTimelog.duration_in_minutes > 0,
  );
}