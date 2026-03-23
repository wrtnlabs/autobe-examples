import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_timelogs_create } from "../../../generate/generate_random_hrm_platform_admin_timelogs_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test the primary success path for deleting a timelog entry.
 *
 * This test validates:
 * 1. Admin authentication and authorization
 * 2. Timelog creation with valid data
 * 3. Timelog retrieval and verification
 * 4. Timelog deletion (soft delete)
 * 5. Successful deletion returns 204 No Content
 */
export async function test_api_timelog_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a timelog entry
  const timelog: IHrmPlatformTimelog =
    await generate_random_hrm_platform_admin_timelogs_create(adminConnection, {
      body: undefined,
    });
  typia.assert(timelog);
  // 3. Verify the timelog exists and has correct structure
  TestValidator.predicate("timelog has valid ID", timelog.id.length > 0);
  TestValidator.predicate("timelog has valid date", timelog.date.length > 0);
  TestValidator.predicate(
    "timelog has positive duration",
    timelog.duration > 0,
  );
  TestValidator.predicate(
    "timelog is not deleted initially",
    timelog.deleted_at === null,
  );
  TestValidator.predicate("timelog has employee", timelog.employee !== null);
  TestValidator.predicate("timelog has project", timelog.project !== null);
  // 4. Retrieve the timelog to verify it exists before deletion
  const retrievedBeforeDelete: IHrmPlatformTimelog =
    await api.functional.hrmPlatform.admin.timelogs.at(adminConnection, {
      timelogId: timelog.id,
    });
  typia.assert(retrievedBeforeDelete);
  TestValidator.equals(
    "retrieved timelog matches created",
    retrievedBeforeDelete.id,
    timelog.id,
  );
  TestValidator.equals(
    "timelog is active before deletion",
    retrievedBeforeDelete.deleted_at,
    null,
  );
  // 5. Delete the timelog - should return 204 No Content
  await api.functional.hrmPlatform.admin.timelogs.erase(adminConnection, {
    timelogId: timelog.id,
  });
  // 6. Verify deletion was successful by attempting to retrieve
  // The timelog should either return with deleted_at set or throw 404
  try {
    const retrievedAfterDelete: IHrmPlatformTimelog =
      await api.functional.hrmPlatform.admin.timelogs.at(adminConnection, {
        timelogId: timelog.id,
      });
    typia.assert(retrievedAfterDelete);
    // If we can still retrieve it, verify it's soft-deleted
    TestValidator.predicate(
      "timelog is soft-deleted after erase",
      retrievedAfterDelete.deleted_at !== null,
    );
    TestValidator.equals(
      "timelog ID remains the same",
      retrievedAfterDelete.id,
      timelog.id,
    );
  } catch (exp) {
    // If we get 404, that's also acceptable - timelog was successfully deleted
    if (exp instanceof api.HttpError) {
      TestValidator.predicate(
        "deletion resulted in 404 (acceptable)",
        exp.status === 404,
      );
    } else {
      throw exp;
    }
  }
}
