import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { HttpError } from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_task_retrieval_without_project_membership(connection: api.IConnection): Promise<void> {
    // Step 1: First member joins
    const firstMemberConnection: api.IConnection = { host: connection.host };
    const firstMemberAuth = await authorize_member_join(firstMemberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(firstMemberAuth);
    // Step 2: First member creates organization membership
    const orgId = typia.random<string & tags.Format<"uuid">>();
    const orgRole = typia.random<string & tags.Format<"uuid">>();
    await api.functional.hrms.member.organization_members.create(firstMemberConnection, {
        body: {
            hrms_member_id: firstMemberAuth.id,
            hrms_organization_id: orgId,
            hrms_organization_role_id: orgRole,
        },
    });
    // Step 3: First member creates project
    const project = await api.functional.hrms.member.organizations.projects.create(firstMemberConnection, {
        organizationId: orgId,
        body: {
            name: RandomGenerator.name(),
            color_code: RandomGenerator.name(),
        },
    });
    typia.assert(project);
    // Step 4: First member creates task within the project
    const task = await api.functional.hrms.member.projects.tasks.create(firstMemberConnection, {
        projectId: (project as any).id as string,
        body: {
            title: RandomGenerator.name(),
        },
    });
    typia.assert(task);
    // Step 5: Second member joins
    const secondMemberConnection: api.IConnection = { host: connection.host };
    const secondMemberAuth = await authorize_member_join(secondMemberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(secondMemberAuth);
    // Step 6: Second member joins the same organization (but not the project)
    await api.functional.hrms.member.organization_members.create(secondMemberConnection, {
        body: {
            hrms_member_id: secondMemberAuth.id,
            hrms_organization_id: orgId,
            hrms_organization_role_id: orgRole,
        },
    });
    // Step 7: Second member attempts to retrieve the task they don't have access to
    await TestValidator.httpError("task not accessible without project membership", 404, async () => {
        await api.functional.hrms.member.tasks.at(secondMemberConnection, {
            taskId: (task as any).id as string,
        });
    });
}