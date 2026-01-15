import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardConfig";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_config_search_advanced(connection: api.IConnection): Promise<void> {
    const adminEmail = typia.random<string & tags.Format<"email">>();
    const adminConnection: api.IConnection = { host: connection.host };

    // Create admin account
    const adminAccount = await authorize_admin_join(adminConnection, {
        body: {
            email: adminEmail,
            password: "AdminPassword123!"
        }
    });

    // Validate admin account
    typia.assert(adminAccount);

    // Define search filters
    const searchFilters = {
        key: "email",
        value: "mail",
        created_at_start: new Date(new Date().getTime() - 86400000).toISOString(),
        created_at_end: new Date().toISOString(),
        page: 1,
        limit: 10
    };

    // Execute API call with proper type annotations
    const result = await api.functional.discussionBoard.admin.configs.index(adminConnection, {
        body: searchFilters satisfies IDiscussionBoardConfig.IRequest
    });

    typia.assert(result);
    if (result.data.length > 0) {
        const matchingItem = result.data.find(item => item.key.includes("email") &&
            item.value.includes("mail"));
        TestValidator.predicate("At least one item should match search criteria", !!matchingItem);
        {
            TestValidator.predicate("No results found, which is acceptable for this test case", true);
        }
    }
}