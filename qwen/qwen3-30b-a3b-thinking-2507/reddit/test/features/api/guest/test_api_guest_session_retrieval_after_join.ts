import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuest";
import type { IRedditGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuestSession";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_session_retrieval_after_join(connection: api.IConnection): Promise<void> {
    const guestConnection: api.IConnection = { host: connection.host };
    await authorize_guest_join(guestConnection, {
        body: {
            device_id: typia.random<string & tags.Format<"uuid">>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    const sessionId = typia.random<string & tags.Format<"uuid">>();
    const session = await api.functional.reddit.guest.sessions.at(connection, {
        sessionId,
    });
    typia.assert(session);
}