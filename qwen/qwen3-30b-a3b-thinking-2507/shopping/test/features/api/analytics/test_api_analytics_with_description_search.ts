import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSystemConfig";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_analytics_with_description_search(connection: api.IConnection): Promise<void> {
    // 1. Admin authentication
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
        },
    });
    
    // 2. Generate configuration description to search for
    const description = RandomGenerator.paragraph({ sentences: 2 });
    const searchQuery = RandomGenerator.substring(description);
    
    // 3. Perform search
    const analytics = await api.functional.ecommerce.admin.configs.analytics.index(adminConnection, {
        body: {
            search: searchQuery,
            key: undefined,
            created_at_min: undefined,
            created_at_max: undefined,
            page: 1,
            limit: 10,
        },
    });
    typia.assert(analytics);
    
    // 4. Validate search results
    TestValidator.predicate(
        "Search results should include configuration with matching description",
        () => {
            return analytics.data.some(config => {
                const searchLower = searchQuery.toLowerCase();
                return config.description.toLowerCase().includes(searchLower);
            });
        }
    );
}