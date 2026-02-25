import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditModerationLog";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditModerationLog";
import type { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import type { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_moderation_logs_pagination_valid_limit(connection: api.IConnection): Promise<void> {
    // 1. Create member account
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            username: RandomGenerator.name(),
        },
    });
    // 2. Retrieve moderation logs with limit=20
    const result = await api.functional.reddit.member.moderation_logs.index(memberConnection, {
        body: {
            limit: 20,
            page: 1,
        },
    });
    // 3. Validate response
    typia.assert(result);
    TestValidator.equals("Should return up to 20 records", result.data.length <= 20, true);
    TestValidator.equals("Pagination limit should be 20", result.pagination.limit, 20);
    TestValidator.equals("Pagination current page should be 1", result.pagination.current, 1);
}