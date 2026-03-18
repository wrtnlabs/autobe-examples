import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_retrieve_own_profile(connection: api.IConnection): Promise<void> {
    // 1. Create an authenticated member account
    const memberJoinConnection: api.IConnection = { host: connection.host };
    const memberJoin: IHrmsMember.IAuthorized = await authorize_member_join(memberJoinConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IHrmsMember.IJoin,
    });
    typia.assert(memberJoin);
    const memberId: string & tags.Format<"uuid"> = memberJoin.id;
    // 2. Create a new connection for the member to use in API calls
    const memberConnection: api.IConnection = { host: connection.host };
    memberConnection.headers = { Authorization: memberJoin.token.access };
    // 3. Create organization and role references
    // These would need to exist in database for real scenario
    const organizationId1: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    const organizationId2: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    const organizationRole1Id: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    const organizationRole2Id: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    // 4. Add member to first organization
    const membership1: IHrmsOrganizationMember = await api.functional.hrms.member.organization_members.create(memberConnection, {
        body: {
            hrms_member_id: memberId,
            hrms_organization_id: organizationId1,
            hrms_organization_role_id: organizationRole1Id,
        } satisfies IHrmsOrganizationMember.ICreate,
    });
    typia.assert(membership1);
    // 5. Add member to second organization with different role
    const membership2: IHrmsOrganizationMember = await api.functional.hrms.member.organization_members.create(memberConnection, {
        body: {
            hrms_member_id: memberId,
            hrms_organization_id: organizationId2,
            hrms_organization_role_id: organizationRole2Id,
        } satisfies IHrmsOrganizationMember.ICreate,
    });
    typia.assert(membership2);
    // 6. Retrieve own profile using member's own connection
    const memberProfile: IHrmsMember = await api.functional.hrms.members.at(memberConnection, {
        memberId: memberId,
    });
    typia.assert(memberProfile);
    // 7. Validate profile fields
    TestValidator.equals("member id matches", memberProfile.id, memberId);
    TestValidator.equals("email matches", memberProfile.email, memberJoin.email);
    TestValidator.equals("display name matches", memberProfile.display_name, memberJoin.display_name);
    TestValidator.equals("avatar_uri is null", memberProfile.avatar_uri, null);
    TestValidator.equals("phone_number is null", memberProfile.phone_number, null);
    TestValidator.equals("created_at is valid date-time", memberProfile.created_at, memberJoin.created_at);
    TestValidator.equals("updated_at is valid date-time", memberProfile.updated_at, memberJoin.updated_at);
    TestValidator.equals("deleted_at is null (active member)", memberProfile.deleted_at, null);
    // 8. Verify password_hash is NOT in response (security check)
    // Using typia type system - IHrmsMember does not have password_hash field
    // But we also validate that it's not present in the actual response
    const profileKeys = Object.keys(memberProfile);
    TestValidator.equals("password_hash field not in response (security)", profileKeys.includes("password_hash"), false);
    // 9. Validate organization_memberships array
    TestValidator.predicate("organization_memberships is array", Array.isArray(memberProfile.organization_memberships));
    TestValidator.equals("has 2 organization memberships", memberProfile.organization_memberships.length, 2);
    // 10. Validate each organization membership structure
    for (let i = 0; i < memberProfile.organization_memberships.length; i++) {
        const membership: IHrmsOrganizationMember.ISummary = memberProfile.organization_memberships[i];
        TestValidator.equals(`membership ${i} has id`, membership.id !== undefined, true);
        TestValidator.equals(`membership ${i} has member reference`, membership.member !== undefined, true);
        TestValidator.equals(`membership ${i} has organization reference`, membership.organization !== undefined, true);
        TestValidator.equals(`membership ${i} has organizationRole reference`, membership.organizationRole !== undefined, true);
        TestValidator.equals(`membership ${i} has created_at`, membership.created_at !== undefined, true);
        TestValidator.equals(`membership ${i} has updated_at`, membership.updated_at !== undefined, true);
        // deleted_at can be null or date-time
        TestValidator.predicate(`membership ${i} deleted_at is valid`, membership.deleted_at === null ||
            typeof membership.deleted_at === "string");
        // Validate member reference structure
        TestValidator.equals(`membership ${i} member has id`, membership.member.id !== undefined, true);
        TestValidator.equals(`membership ${i} member email matches`, membership.member.email, memberJoin.email);
        TestValidator.equals(`membership ${i} member display_name matches`, membership.member.display_name, memberJoin.display_name);
        // Validate organization reference structure
        TestValidator.equals(`membership ${i} organization has id`, membership.organization.id !== undefined, true);
        TestValidator.equals(`membership ${i} organization has name`, membership.organization.name !== undefined, true);
        // Validate organizationRole reference structure
        TestValidator.equals(`membership ${i} organizationRole has id`, membership.organizationRole.id !== undefined, true);
        TestValidator.equals(`membership ${i} organizationRole has name`, membership.organizationRole.name !== undefined, true);
        TestValidator.equals(`membership ${i} organizationRole has is_builtin`, typeof membership.organizationRole.is_builtin, "boolean");
    }
}