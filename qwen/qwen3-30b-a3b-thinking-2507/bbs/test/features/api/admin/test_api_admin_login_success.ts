import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_login_success(connection: api.IConnection): Promise<void> {
    // Create a new admin account using utility function
    const adminConnection: api.IConnection = { host: connection.host };
    const admin: IEconPoliticBoardAdmin.IAuthorized = await authorize_admin_join(
        adminConnection,
        {
            body: {
                email: typia.random<string & tags.Format<"email">>(),
                password: RandomGenerator.alphaNumeric(12) + 'Aa1!',
            } satisfies IEconPoliticBoardAdmin.IJoin,
        },
    );

    // Verify account creation success
    typia.assert(admin);
    TestValidator.equals("admin account email match", admin.email, admin.email);

    // Now authenticate with the newly created account
    const token: IEconPoliticBoardAdmin.IAuthorized = await authorize_admin_login(
        adminConnection,
        {
            body: {
                email: admin.email,
                password: 'Aa1!'.concat(RandomGenerator.alphaNumeric(12)),
            } satisfies IEconPoliticBoardAdmin.ILogin,
        },
    );

    // Validate token response properties
    typia.assert(token);
    // Validate token format and expiration
    TestValidator.predicate("access token exists", token.token.access.length > 0);
    TestValidator.predicate("refresh token exists", token.token.refresh.length > 0);

    // Proper date comparison for token expiration
    const now = new Date().getTime();
    const accessExpiry = new Date(token.token.expired_at).getTime();
    const refreshExpiry = new Date(token.token.refreshable_until).getTime();

    TestValidator.predicate(
        "access token expires within 1 hour",
        accessExpiry - now <= 3600 * 1000,
    );
    TestValidator.predicate(
        "refresh token expires within 30 days",
        refreshExpiry - now <= 30 * 24 * 3600 * 1000,
    );

    // Validate user details match expectations
    TestValidator.equals("admin user ID match", token.id, admin.id);
    TestValidator.equals("admin email match", token.email, admin.email);
}