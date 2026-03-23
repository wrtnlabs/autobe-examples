import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTaskSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_admin_projects_tasks_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test organization-level data isolation for task snapshot access.
 * Verifies that an authenticated admin can only retrieve task snapshots
 * from tasks within their own organization, ensuring multi-tenancy security.
 */
export async function test_api_task_snapshot_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin1 account and authenticate
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Password = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(admin1Connection, {
    body: {
      email: admin1Email,
      password: admin1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create admin2 account and authenticate
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(admin2Connection, {
    body: {
      email: admin2Email,
      password: admin2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 3. Create a project in admin1's organization
  const project1 = await generate_random_hrm_platform_member_projects_create(
    admin1Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project1);
  // 4. Create a task in admin1's organization
  const task1 = await generate_random_hrm_platform_admin_projects_tasks_create(
    admin1Connection,
    {
      params: { projectId: project1.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "high",
      },
    },
  );
  typia.assert(task1);
  // 5. Create a project in admin2's organization
  const project2 = await generate_random_hrm_platform_member_projects_create(
    admin2Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        color_code: "#33FF57",
      },
    },
  );
  typia.assert(project2);
  // 6. Create a task in admin2's organization
  const task2 = await generate_random_hrm_platform_admin_projects_tasks_create(
    admin2Connection,
    {
      params: { projectId: project2.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task2);
  // 7. Authenticate as admin1 and retrieve task snapshots
  const admin1LoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(admin1LoginConnection, {
    body: {
      email: admin1Email,
      password: admin1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 8. Retrieve task snapshots as admin1
  const snapshots = await api.functional.hrmPlatform.admin.task_snapshots.index(
    admin1LoginConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTaskSnapshot.IRequest,
    },
  );
  typia.assert(snapshots);
  // 9. Verify admin1 can see snapshots from their own organization's task
  TestValidator.predicate(
    "admin1 can see snapshots from their organization",
    snapshots.data.length > 0,
  );
  // 10. Verify all snapshots belong to admin1's organization (not admin2's)
  for (const snapshot of snapshots.data) {
    TestValidator.equals(
      "snapshot belongs to admin1's organization",
      snapshot.project.id,
      project1.id,
    );
    TestValidator.notEquals(
      "snapshot does not belong to admin2's organization",
      snapshot.project.id,
      project2.id,
    );
  }
  // 11. Verify no snapshots from admin2's organization exist
  TestValidator.predicate(
    "admin1 cannot see any snapshots from other organizations",
    !snapshots.data.some((snapshot) => snapshot.project.id === project2.id),
  );
}
