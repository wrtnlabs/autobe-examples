import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerActivityLog";
import type { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import type { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_departments_create } from "../../../generate/generate_random_hrm_tracker_member_departments_create";
import { prepare_random_hrm_tracker_department } from "../../../prepare/prepare_random_hrm_tracker_department";

export async function test_api_activity_logs_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12341234",
      display_name: "Admin User",
    },
  });
  typia.assert(adminMember);
  // Update adminConnection with token from registration
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminMember.token.access,
  };
  // 2. Create department (generates activity log entry)
  const department = await api.functional.hrmTracker.member.departments.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: null,
        parent_id: null,
      } satisfies IHrmTrackerDepartment.ICreate,
    },
  );
  typia.assert(department);
  // 3. Query activity logs with pagination
  const logsResponse = await api.functional.hrmTracker.activity_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "-created_at",
      } satisfies IHrmTrackerActivityLog.IRequest,
    },
  );
  typia.assert(logsResponse);
  // 4. Validate results
  TestValidator.equals("has logs", logsResponse.data.length > 0, true);
  if (logsResponse.data.length > 0) {
    const log = logsResponse.data[0];
    // Validate required fields exist
    TestValidator.equals(
      "has target_entity_type",
      log.target_entity_type.length > 0,
      true,
    );
    TestValidator.equals(
      "has target_entity_id",
      log.target_entity_id !== undefined,
      true,
    );
    TestValidator.equals("has action_type", log.action_type.length > 0, true);
    // Validate actorMember reference exists
    TestValidator.equals("has actorMember", log.actorMember !== null, true);
    if (log.actorMember) {
      TestValidator.equals(
        "actorMember has id",
        log.actorMember.id.length > 0,
        true,
      );
      TestValidator.equals(
        "actorMember has display_name",
        log.actorMember.display_name.length > 0,
        true,
      );
    }
    // Validate pagination metadata
    TestValidator.equals(
      "pagination current page",
      logsResponse.pagination.current,
      1,
    );
    TestValidator.equals("pagination limit", logsResponse.pagination.limit, 10);
    TestValidator.predicate(
      "pagination records >= 1",
      logsResponse.pagination.records >= 1,
    );
    TestValidator.equals(
      "pagination pages >= 1",
      logsResponse.pagination.pages >= 1,
      true,
    );
    // Verify sorting by created_at descending
    if (logsResponse.data.length >= 2) {
      const firstLog = logsResponse.data[0];
      const secondLog = logsResponse.data[1];
      TestValidator.predicate(
        "first log is newer than second",
        new Date(firstLog.created_at) >= new Date(secondLog.created_at),
      );
    }
  }
}