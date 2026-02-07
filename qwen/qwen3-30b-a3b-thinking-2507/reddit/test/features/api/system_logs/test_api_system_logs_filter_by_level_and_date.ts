import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemLog";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_system_logs_filter_by_level_and_date(connection: api.IConnection): Promise<void> {
    // 1. Admin setup
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        }
    });

    // 2. Retrieve system logs filtered by INFO level and last 24 hours
    const logs = await api.functional.communityPlatform.admin.system.logs.index(adminConnection, {
        body: {
            level: "INFO",
            startDate: twentyFourHoursAgo.toISOString(),
            endDate: now.toISOString(),
            page: 1,
            limit: 10,
        }
    });
    typia.assert(logs);

    // 3. Validate the filtered results
    TestValidator.equals("All logs are INFO level", logs.data.every(log => log.level === "INFO"), true);
    TestValidator.equals("Log entries have expected date range", logs.data.every(log => {
        const logTime = new Date(log.created_at);
        return logTime >= twentyFourHoursAgo && logTime <= now;
    }), true);
    TestValidator.equals("Pagination limit is respected", logs.data.length <= logs.pagination.limit, true);
}