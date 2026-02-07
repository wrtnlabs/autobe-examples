import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { prepare_random_discussion_board_bans_appeal } from "../../../prepare/prepare_random_discussion_board_bans_appeal";
import { generate_random_discussion_board_super_admin_moderation_queue_create } from "../../../generate/generate_random_discussion_board_super_admin_moderation_queue_create";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_bans_appeal_creation(connection: api.IConnection): Promise<void> {
    // Create super admin connection and authenticate
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_super_admin_login(adminConnection, {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    });
    // Generate random ban record ID for testing
    const banRecordId: string = typia.random<string & tags.Format<"uuid">>();
    // Create appeal with empty body (as ICreate has no required fields)
    const appeal = await api.functional.discussionBoard.superAdmin.moderation.queue.create(adminConnection, {
        banRecordId: banRecordId,
        body: typia.random<IDiscussionBoardBansAppeal.ICreate>(),
    });
    typia.assert(appeal);
}
// Helper function for super admin login
async function authorize_super_admin_login(connection: api.IConnection, props: {
    body: IDiscussionBoardSuperAdmin.IJoin;
}): Promise<IDiscussionBoardSuperAdmin.IAuthorized> {
    return await api.functional.discussionBoard.auth.super_admin.join(connection, {
        body: props.body,
    });
}