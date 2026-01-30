import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaHistory";
import { prepare_random_community_bbs_karma_history } from "../../../prepare/prepare_random_community_bbs_karma_history";
import { generate_random_community_bbs_admin_karma_history_create } from "../../../generate/generate_random_community_bbs_admin_karma_history_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_karma_history_creation_by_admin(connection: api.IConnection): Promise<void> {
    // Step 1: Create admin connection and authenticate via join
    const adminConnection: api.IConnection = { host: connection.host };
    const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16)
        } satisfies ICommunityBbsAdmin.IJoin
    });
    typia.assert(admin);
    // Step 2: Generate random user_id for karma change
    const targetUserId = typia.random<string & tags.Format<"uuid">>();
    // Step 3: Create karma history record with positive delta (+10) for exemplary contribution
    const karmaHistory: ICommunityBbsKarmaHistory = await generate_random_community_bbs_admin_karma_history_create(adminConnection, {
        body: {
            userId: targetUserId,
            delta: 10,
            reason: "Exemplary community contribution"
        } satisfies ICommunityBbsKarmaHistory.ICreate
    });
    typia.assert(karmaHistory);
    // Step 4: Validate all properties of created karma history record
    TestValidator.equals("karma history user_id matches", karmaHistory.user_id, targetUserId);
    TestValidator.equals("karma history delta is +10", karmaHistory.delta, 10);
    TestValidator.predicate("karma history reason length >= 5", karmaHistory.reason.length >= 5);
    TestValidator.predicate("karma history created_at is valid date-time", typia.is<tags.Format<"date-time">>(karmaHistory.created_at));
    TestValidator.predicate("karma history id is valid uuid", typia.is<tags.Format<"uuid">>(karmaHistory.id));
    TestValidator.equals("karma history new_score is greater than previous_score", karmaHistory.new_score > karmaHistory.previous_score, true);
}