import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import type { IEconomicPoliticalDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardUserSession";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_sessions_list_with_pagination(connection: api.IConnection): Promise<void> {
    // 1. Register user
    const userConnection: api.IConnection = { host: connection.host };
    const userAuth = await authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            href: "https://example.com",
            referrer: "https://example.com",
        } satisfies IEconomicPoliticalDiscussionBoardUser.IJoin,
    });
    // 2. Create connection with user's token
    const userConnectionWithAuth: api.IConnection = {
        host: connection.host,
        headers: {
            ...userConnection.headers,
            Authorization: `Bearer ${userAuth.token.access}`,
        },
    };
    // 3. Request sessions with pagination
    const response = await api.functional.economicPoliticalDiscussionBoard.user.sessions.index(userConnectionWithAuth, {
        body: {
            page: 2,
            size: 5,
            sortBy: "expired_at", // sorted earliest first
        } satisfies IEconomicPoliticalDiscussionBoardUserSession.IRequest,
    });
    typia.assert(response);
    // 4. Validate response
    TestValidator.equals("should have 5 sessions", response.data.length, 5);
    TestValidator.equals("current page should be 2", response.pagination.current, 2);
    TestValidator.equals("page size should be 5", response.pagination.limit, 5);
    TestValidator.equals("total sessions should be at least 5", response.pagination.records, 10);
}