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
import { prepare_random_economy_politics_board_user_ban } from "../../../prepare/prepare_random_economy_politics_board_user_ban";
import { generate_random_economy_politics_board_admin_users_bans_create } from "../../../generate/generate_random_economy_politics_board_admin_users_bans_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_user_ban_expired_retrieval(connection: api.IConnection): Promise<void> {
    // Admin authentication
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            href: "https://example.com",
            referrer: "https://example.com",
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEconomyPoliticsBoardAdmin.IJoin,
    });

    // Create a user with a ban (assumed user ID exists, using random UUID)
    const userId = typia.random<string & tags.Format<"uuid">>();
    
    // Create ban record with an expired date (a date in the past)
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
    
    // Create ban record
    const ban = await generate_random_economy_politics_board_admin_users_bans_create(adminConnection, {
        params: { userId },
        body: {
            reason: "Test ban with expired date",
            expire_at: expiredDate,
        } satisfies IEconomyPoliticsBoardUserBan.ICreate,
    });
    
    // Retrieve the ban record
    const retrievedBan = await api.functional.economyPoliticsBoard.admin.users.bans.at(adminConnection, {
        userId,
        banId: ban.id,
    });
    
    // Use typia.assert correctly
    typia.assert(retrievedBan);
    
    // Validate the retrieved ban is expired
    TestValidator.equals("ban should have expired date", retrievedBan.expire_at, expiredDate);
    TestValidator.predicate("ban should show as expired", Date.parse(retrievedBan.expire_at!) < Date.now());
}