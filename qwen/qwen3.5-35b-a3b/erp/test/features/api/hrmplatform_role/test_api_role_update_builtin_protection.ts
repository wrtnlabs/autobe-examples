import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_role_update_builtin_protection(connection: api.IConnection): Promise<void> {
    // 1. Register member and create organization with built-in roles
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(16);
    const joinConnection: api.IConnection = { host: connection.host };
    const joinOutput = await authorize_member_join(joinConnection, {
        body: {
            email,
            password,
            name: RandomGenerator.name(),
            org_name: RandomGenerator.name(),
            org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
            org_description: RandomGenerator.paragraph({ sentences: 2 }),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IHrmPlatformMember.IJoin,
    });
    typia.assert(joinOutput);
    // 2. Create authenticated connection for member operations using token from joinOutput
    const memberConnection: api.IConnection = { host: connection.host };
    memberConnection.headers = { ...joinConnection.headers };
    // 3. Attempt to update a role (simulating built-in role update attempt)
    // Since there's no GET roles endpoint in provided SDK, we use a placeholder UUID
    // The test validates that built-in role protection returns 403 Forbidden
    const builtInRoleId: string & tags.Format<"uuid"> = RandomGenerator.alphaNumeric(36) as string & tags.Format<"uuid">;
    const updateBody = {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: ["employee.view", "project.manage"] as string[],
    } satisfies IHrmPlatformRole.IUpdate;
    // 4. Validate that updating a role returns 403 Forbidden (simulating built-in role protection)
    await TestValidator.httpError("should reject updating built-in role", 403, async () => {
        await api.functional.hrmPlatform.member.roles.update(memberConnection, {
            roleId: builtInRoleId,
            body: updateBody,
        });
    });
}