import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelog";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_timelog_list_organization_isolation(connection: api.IConnection): Promise<void> {
    const organizationConnection: api.IConnection = { host: connection.host };
    const secondOrganizationConnection: api.IConnection = { host: connection.host };
    const firstMember = await authorize_member_join(organizationConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(12),
        } satisfies IHrmTimeTrackingMember.IJoin,
    });
    typia.assert(firstMember);
    const firstOrganization = await api.functional.hrmTimeTracking.member.organizations.create(organizationConnection, {
        body: {
            name: `Org-${RandomGenerator.alphabets(8)}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            currency: "USD",
            timezone: "Asia/Seoul",
            fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
    });
    typia.assert(firstOrganization);
    const secondMember = await authorize_member_join(secondOrganizationConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(12),
        } satisfies IHrmTimeTrackingMember.IJoin,
    });
    typia.assert(secondMember);
    const secondOrganization = await api.functional.hrmTimeTracking.member.organizations.create(secondOrganizationConnection, {
        body: {
            name: `Org-${RandomGenerator.alphabets(8)}-B`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            currency: "USD",
            timezone: "Asia/Seoul",
            fiscalStartMonth: 2,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
    });
    typia.assert(secondOrganization);
    const ownBrowse = await api.functional.hrmTimeTracking.member.timelogs.index(organizationConnection, {
        body: {
            page: 1,
            limit: 10,
            sort: "work_date_desc",
        } satisfies IHrmTimeTrackingTimelog.IRequest,
    });
    typia.assert(ownBrowse);
    TestValidator.predicate("timelog browse returns pagination metadata", ownBrowse.pagination.current >= 0 && ownBrowse.pagination.limit >= 0);
    TestValidator.predicate("timelog browse data is an array", Array.isArray(ownBrowse.data));
    TestValidator.predicate("organization-scoped browse does not leak cross-tenant data", ownBrowse.data.every((timelog) => timelog.project.organization.id === firstOrganization.id));
    const crossTenantBrowse = await api.functional.hrmTimeTracking.member.timelogs.index(organizationConnection, {
        body: {
            employee_id: secondMember.id,
            page: 1,
            limit: 10,
            sort: "created_at_desc",
        } satisfies IHrmTimeTrackingTimelog.IRequest,
    });
    typia.assert(crossTenantBrowse);
    TestValidator.predicate("cross-tenant browse remains within active organization", crossTenantBrowse.data.every((timelog) => timelog.project.organization.id === firstOrganization.id));
    TestValidator.predicate("cross-tenant browse never includes second organization data", crossTenantBrowse.data.every((timelog) => timelog.project.organization.id !== secondOrganization.id));
    TestValidator.predicate("cross-tenant browse respects caller scope over request filters", crossTenantBrowse.data.every((timelog) => timelog.employee.userAccount !== null));
}