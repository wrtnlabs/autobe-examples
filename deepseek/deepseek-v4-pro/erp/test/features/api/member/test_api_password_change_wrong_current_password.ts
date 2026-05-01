import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test that password change is rejected when the current password is incorrect.
 *
 * Validates the security requirement that a member must prove their identity by providing the correct current password before the system allows a password update. Sending an incorrect current password must result in a 403 Forbidden response, the stored password must remain unchanged, and the member's original credentials must continue to work for authentication.
 *
 * 1. Member joins with a known email and password.
 * 2. Member attempts to change password with an incorrect currentPassword.
 * 3. System rejects the attempt with 403 Forbidden.
 * 4. Member can still authenticate with the original credentials.
 */
export async function test_api_password_change_wrong_current_password(connection: api.IConnection): Promise<void>
{
    // 1. Join as a new member with known credentials
    const memberConnection: api.IConnection = { host: connection.host };
    const password = RandomGenerator.alphaNumeric(16);
    const email = typia.random<string & tags.Format<"email">>();
    const member = await authorize_member_join(memberConnection, {
        body: { email, password },
    });
    typia.assert(member);
    // 2. Attempt to change password with wrong current password
    await TestValidator.httpError("wrong current password should be rejected with 403", 403, async () =>
    {
        await api.functional.erpHrm.member.passwords.change(memberConnection, {
            body: {
                currentPassword: RandomGenerator.alphaNumeric(16),
                newPassword: RandomGenerator.alphaNumeric(16),
            } satisfies IErpHrmMember.IChangePassword,
        });
    });
    // 3. Verify original credentials still work
    const loginConnection: api.IConnection = { host: connection.host };
    const reLoggedIn = await authorize_member_login(loginConnection, {
        body: {
            email: member.email,
            password,
            href: "https://localhost",
            referrer: "",
        } satisfies IErpHrmMember.ILogin,
    });
    typia.assert(reLoggedIn);
}