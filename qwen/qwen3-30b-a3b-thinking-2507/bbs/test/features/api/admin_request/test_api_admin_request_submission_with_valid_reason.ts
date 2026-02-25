import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdminRequest";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { prepare_random_economic_political_discussion_board_admin_request } from "../../../prepare/prepare_random_economic_political_discussion_board_admin_request";
import { generate_random_economic_political_discussion_board_user_requests_create } from "../../../generate/generate_random_economic_political_discussion_board_user_requests_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_admin_request_submission_with_valid_reason(connection: api.IConnection): Promise<void> {
    // Create user connection
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    // Create admin request
    const request = await generate_random_economic_political_discussion_board_user_requests_create(userConnection, {
        body: {
            reason: RandomGenerator.paragraph({ sentences: 5 }) satisfies string & tags.MinLength<50>,
        },
    });
    typia.assert(request);
}