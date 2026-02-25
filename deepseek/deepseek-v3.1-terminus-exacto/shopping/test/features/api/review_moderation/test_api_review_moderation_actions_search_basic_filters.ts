import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewModerationAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewModerationAction";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_review_moderation_actions_search_basic_filters(connection: api.IConnection): Promise<void> {
    // Step 1: Administrator authentication
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_administrator_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.Format<"password">>(),
        },
    });
    typia.assert(admin);

    // Step 2: Prepare search criteria with basic filters
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    const searchBody = {
        action_type: "remove_content" satisfies string | null as string | null,
        status: "completed" satisfies string | null as string | null,
        administrator_id: admin.id satisfies string | null as string | null,
        created_at_from: oneWeekAgo satisfies string | null as string | null,
        created_at_to: now satisfies string | null as string | null,
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
    } satisfies IEcommerceReviewModerationAction.IRequest;

    // Step 3: Search for review moderation actions
    const result = await api.functional.ecommerce.administrator.review_moderation_actions.index(adminConnection, { body: searchBody });
    typia.assert(result);

    // Step 4: Validate pagination metadata structure
    TestValidator.predicate("pagination exists", () => result.pagination !== undefined);
    TestValidator.equals("current page matches request", result.pagination.current, 1);
    TestValidator.equals("page limit matches request", result.pagination.limit, 10);
    TestValidator.predicate("records count is non-negative", () => result.pagination.records >= 0);
    TestValidator.predicate("pages count is non-negative", () => result.pagination.pages >= 0);

    // Step 5: Validate data structure
    TestValidator.predicate("data is array", () => Array.isArray(result.data));

    // Step 6: Test edge case with null filter values
    const nullFilterBody = {
        action_type: null,
        status: null,
        administrator_id: null,
        created_at_from: null,
        created_at_to: null,
        page: 1 satisfies number as number,
        limit: 20 satisfies number as number,
    } satisfies IEcommerceReviewModerationAction.IRequest;

    const nullResult = await api.functional.ecommerce.administrator.review_moderation_actions.index(adminConnection, { body: nullFilterBody });
    typia.assert(nullResult);

    TestValidator.predicate("null filter result has pagination", () => nullResult.pagination !== undefined);
    TestValidator.predicate("null filter data is array", () => Array.isArray(nullResult.data));
}