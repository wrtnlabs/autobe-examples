import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

interface IErpHrmProjectWithId extends DeepPartial<IErpHrmProject> {
  id: string;
  name: string;
}

export async function test_api_project_deletion_without_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create a project without any timelogs
  const project = typia.assert<IErpHrmProjectWithId>(
    await generate_random_erp_hrm_admin_projects_create(adminConnection, {
      body: {
        name: RandomGenerator.name(3),
        color: "#FF5733",
        status: "active",
      },
    }),
  );
  // 3. Delete the project (no timelogs associated)
  await api.functional.erpHrm.admin.projects.erase(adminConnection, {
    projectId: project.id,
  });
  // 4. Validate project no longer exists by trying to create with same name
  // (Project names must be unique within organization, so duplicate name should succeed)
  const secondProject = typia.assert<IErpHrmProjectWithId>(
    await generate_random_erp_hrm_admin_projects_create(adminConnection, {
      body: {
        name: project.name,
        color: "#4A90E2",
        status: "active",
      },
    }),
  );
  TestValidator.equals(
    "project name is reusable",
    secondProject.name,
    project.name,
  );
}