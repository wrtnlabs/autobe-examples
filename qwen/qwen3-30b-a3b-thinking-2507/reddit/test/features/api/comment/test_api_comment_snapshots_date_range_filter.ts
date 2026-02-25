import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditProfileSnapshot";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfileSnapshot";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_snapshots_date_range_filter(connection: api.IConnection): Promise<void> {
    // 1. Register new moderator account
    const moderatorConnection: api.IConnection = { host: connection.host };
    const body: IRedditMember.IJoin = {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: RandomGenerator.name(),
    };
    await authorize_member_join(moderatorConnection, { body });

    // 2. Set up date range filter
    const created_at_min = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const created_at_max = new Date().toISOString();

    // 3. Query comment snapshots with date range
    const response = await api.functional.reddit.member.snapshots.index(moderatorConnection, {
        body: {
            created_at_min,
            created_at_max,
        }
    });
    typia.assert(response);

    // 4. Validate chronological order and date range
    if (response?.data.length > 0) {
        const firstDate = new Date(response.data[0].created_at);
        const lastDate = new Date(response.data[response.data.length - 1].created_at);
        // Verify order is chronological (oldest first)
        TestValidator.predicate('order is chronological', firstDate <= lastDate);
        // Verify date range includes all responses
        TestValidator.equals('date range includes all results', response.data.every(item => (new Date(item.created_at) >= new Date(created_at_min)) &&
            (new Date(item.created_at) <= new Date(created_at_max))), true);
    }
}