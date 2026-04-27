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
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganization";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member who owns an organization can retrieve it in the paginated organization list.
 *
 * Validates the complete flow of member registration, organization creation, and organization listing. Ensures that the owner can see their own organization in the paginated results with correct field values.
 *
 * 1. Register a new member account via authorize_member_join.
 * 2. Create an organization with specific configuration (name, currency=USD, timezone=America/New_York, fiscal_start_month=1).
 * 3. List organizations accessible to the authenticated member with an empty filter body.
 * 4. Validate the paginated response contains the created organization with matching identity and configuration fields.
 */
export async function test_api_organization_list_by_owner(connection: api.IConnection): Promise<void> {
    // 1. Register a new member
    const memberConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(authorized);

    // 2. Create an organization
    const orgName: string = RandomGenerator.name(3);
    const organization = await api.functional.hrmTimeTracking.member.organizations.create(memberConnection, {
        body: {
            name: orgName,
            currency: "USD",
            timezone: "America/New_York",
            fiscal_start_month: 1 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>,
        },
    });
    typia.assert(organization);

    // 3. List organizations accessible to the member
    const page = await api.functional.hrmTimeTracking.member.organizations.index(memberConnection, {
        body: {} satisfies IHrmTimeTrackingOrganization.IRequest,
    });
    typia.assert(page);

    // 4. Validate the created organization appears in the list
    const foundOrg = page.data.find((o: IHrmTimeTrackingOrganization.ISummary) => o.id === organization.id);
    TestValidator.predicate("created organization appears in the paginated list", foundOrg !== undefined);
    const org: IHrmTimeTrackingOrganization.ISummary = foundOrg!;
    TestValidator.equals("organization id matches", org.id, organization.id);
    TestValidator.equals("organization name matches", org.name, organization.name);
    TestValidator.equals("organization currency matches", org.currency, organization.currency);
    TestValidator.equals("organization timezone matches", org.timezone, organization.timezone);
    TestValidator.equals("organization fiscal_start_month matches", org.fiscal_start_month, organization.fiscal_start_month);
    TestValidator.equals("organization status is active", org.status, "active");
    TestValidator.equals("organization owner id matches", org.owner.id, authorized.id);
    TestValidator.equals("organization owner email matches", org.owner.email, authorized.email);
}