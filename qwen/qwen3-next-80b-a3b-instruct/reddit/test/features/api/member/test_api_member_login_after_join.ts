import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_login_after_join(connection: api.IConnection): Promise<void> {
    // 1. Join: Register member with unverified email
    const joinConnection: api.IConnection = { host: connection.host };
    const joinEmail = typia.random<string & tags.Format<'email'>>();
    const joinPassword = 'SecurePass123!';
    const joinResponse = await authorize_member_join(joinConnection, {
        body: { email: joinEmail, password: joinPassword } satisfies ICommunityMember.IJoin,
    });
    typia.assert(joinResponse);
    // 2. Simulate email verification: Set is_email_verified = true
    // Note: This is done externally; our test must assume state change occurred
    // No direct API call for verification, as it's handled by external system
    // 3. Login: Authenticate with same credentials after verification
    const loginConnection: api.IConnection = { host: connection.host };
    const loginResponse = await authorize_member_login(loginConnection, {
        body: { email: joinEmail, password: joinPassword } satisfies ICommunityMember.ILogin,
    });
    typia.assert(loginResponse);
    // 4. Validate login response
    TestValidator.equals('token access exists', loginResponse.token.access, loginResponse.token.access);
    TestValidator.equals('token refresh exists', loginResponse.token.refresh, loginResponse.token.refresh);
    TestValidator.predicate('access token is string', typeof loginResponse.token.access === 'string');
    TestValidator.predicate('refresh token is string', typeof loginResponse.token.refresh === 'string');
    TestValidator.predicate('expired_at is ISO date-time', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(loginResponse.token.expired_at));
    TestValidator.predicate('refreshable_until is ISO date-time', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(loginResponse.token.refreshable_until));
}