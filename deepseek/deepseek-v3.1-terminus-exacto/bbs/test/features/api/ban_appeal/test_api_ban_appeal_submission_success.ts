import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { generate_random_discussion_board_user_bans_my_ban_appeals_create } from "../../../generate/generate_random_discussion_board_user_bans_my_ban_appeals_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_ban_appeal_submission_success(connection: api.IConnection): Promise<void> {
    // 1. Admin setup
    const adminConnection: api.IConnection = { host: connection.host };
    const adminPassword = RandomGenerator.alphaNumeric(16);
    const adminJoinResult = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: adminPassword,
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardAdmin.IJoin,
    });
    typia.assert(adminJoinResult);

    // 2. User setup
    const userConnection: api.IConnection = { host: connection.host };
    const userPassword = RandomGenerator.alphaNumeric(16);
    const userJoinResult = await authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: userPassword,
            display_name: RandomGenerator.name(),
        } satisfies IDiscussionBoardUser.IJoin,
    });
    typia.assert(userJoinResult);

    // 3. Admin creates temporary ban against user
    const banDurationDays = typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>>();
    const ban = await generate_random_discussion_board_admin_bans_create(adminConnection, {
        body: {
            bannedUserId: userJoinResult.id,
            banReason: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
            banDurationType: "temporary" as const,
            banDurationDays: banDurationDays,
        } satisfies IDiscussionBoardBanRecord.ICreate,
    });
    typia.assert(ban);

    // 4. Create user connection and authenticate
    const bannedUserConnection: api.IConnection = { host: connection.host };
    await authorize_user_login(bannedUserConnection, {
        body: {
            email: userJoinResult.email,
            password: userPassword,
        } satisfies IDiscussionBoardUser.ILogin,
    });

    // 5. User submits ban appeal
    const appealReason = RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 });
    const appeal = await generate_random_discussion_board_user_bans_my_ban_appeals_create(bannedUserConnection, {
        body: {
            appeal_reason: appealReason,
        } satisfies IDiscussionBoardBanAppeal.ICreate,
    });
    typia.assert(appeal);

    // 6. Validate appeal creation
    TestValidator.equals("appeal reason matches input", appeal.appeal_reason, appealReason);
    TestValidator.equals("appeal has pending status", appeal.status, "pending");
    TestValidator.predicate("appeal has valid UUID", typeof appeal.id === "string" && appeal.id.length > 0);
    TestValidator.predicate("appeal has valid timestamp", appeal.appealed_at.length > 0);
    TestValidator.equals("appeal linked to correct ban", appeal.banRecord.id, ban.id);
    TestValidator.equals("appeal linked to correct user", appeal.user.id, userJoinResult.id);
}