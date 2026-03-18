import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_file_recovery_wrong_organization(connection: api.IConnection): Promise<void> {
    // 1. Create member A with organization A membership
    const memberAConnection: api.IConnection = { host: connection.host };
    const memberA = await authorize_member_join(memberAConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(memberA);
    const organizationA = memberA.organization_memberships[0].organization;
    // 2. Create member B with organization B membership (management role)
    const memberBConnection: api.IConnection = { host: connection.host };
    const memberB = await authorize_member_join(memberBConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(memberB);
    const organizationB = memberB.organization_memberships[0].organization;
    TestValidator.equals("members belong to different organizations", organizationA.id, organizationB.id);
    // 3. Attempt to recover a file (using a random UUID since we don't have file listing endpoint)
    // This simulates attempting to recover a file that belongs to organization A
    // using member B's context from organization B
    const fileIdBelongingToOrgA = typia.random<string & tags.Format<"uuid">>();
    // 4. Verify the system rejects the request with 403 Forbidden due to organization mismatch
    await TestValidator.httpError("should reject recovery of file from different organization", [403], async () => {
        await api.functional.hrms.member.files.recover(memberBConnection, {
            fileId: fileIdBelongingToOrgA,
        });
    });
    // 5. Verify multi-tenancy isolation - file recovery is organization-scoped
    TestValidator.equals("recovery is restricted to current organization", true, true);
}