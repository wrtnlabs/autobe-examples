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
export async function test_api_user_session_retrieval_unauthorized(connection: api.IConnection): Promise<void> {
    // Create first user account
    const user1Connection: api.IConnection = { host: connection.host };
    await authorize_user_join(user1Connection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEconomicPoliticalDiscussionBoardUser.IJoin,
    });
    // Create second user account
    const user2Connection: api.IConnection = { host: connection.host };
    await authorize_user_join(user2Connection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEconomicPoliticalDiscussionBoardUser.IJoin,
    });
    // Get session ID for first user
    const user1SessionData = await api.functional.economicPoliticalDiscussionBoard.user.sessions.index(user1Connection, {
        body: {} as IEconomicPoliticalDiscussionBoardUserSession.IRequest,
    });
    typia.assert(user1SessionData);
    // Retrieve first session ID (assuming it's the first one)
    const session1Id = user1SessionData.data[0].id;
    // Attempt to access first user's session with second user's connection (should fail with 403)
    await TestValidator.error("should return 403 for unauthorized session access", async () => {
        await api.functional.economicPoliticalDiscussionBoard.user.sessions.at(user2Connection, { sessionId: session1Id });
    });
}