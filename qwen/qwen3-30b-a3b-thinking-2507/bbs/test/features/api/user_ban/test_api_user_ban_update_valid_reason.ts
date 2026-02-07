import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import type { IEconomyPoliticsBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUserBan";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_user_ban_update_valid_reason(connection: api.IConnection): Promise<void> {
    // 1. Admin setup
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "adminpassword123",
            href: "https://example.com/admin/join",
            referrer: "https://example.com/admin",
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    
    // 2. Use a known ban ID for updating
    const userId = typia.random<string & tags.Format<"uuid">>();
    const banId = typia.random<string & tags.Format<"uuid">>();
    
    // 3. Update the ban record with 12-character reason
    const updatedBan = await api.functional.economyPoliticsBoard.admin.users.bans.update(adminConnection, {
        userId,
        banId,
        body: {
            reason: "12charsvalid", // Exactly 12 characters
            expire_at: null,
        },
    });
    
    typia.assert(updatedBan);
    
    // 4. Validate the update
    TestValidator.equals("reason matches input", updatedBan.reason, "12charsvalid");
    TestValidator.predicate("reason meets minimum length", updatedBan.reason.length >= 10);
}