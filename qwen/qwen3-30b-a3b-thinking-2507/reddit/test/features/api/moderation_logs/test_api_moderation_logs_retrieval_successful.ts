import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditModerationLog";
import type { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import type { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_moderation_logs_retrieval_successful(connection: api.IConnection): Promise<void> {
    // Create moderator-specific connection
    const moderatorConnection: api.IConnection = { host: connection.host };
    // Register and authenticate moderator
    const moderator = await authorize_member_join(moderatorConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            username: RandomGenerator.name(1),
        }
    });
    // Retrieve moderation log details
    const logId = typia.random<string & tags.Format<"uuid">>();
    const log = await api.functional.reddit.member.moderation_logs.at(moderatorConnection, { logId });
    typia.assert(log);
}