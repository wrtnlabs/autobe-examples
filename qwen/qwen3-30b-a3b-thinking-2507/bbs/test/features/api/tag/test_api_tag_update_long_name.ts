import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdmin";
import type { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import { prepare_random_economic_political_discussion_board_tag } from "../../../prepare/prepare_random_economic_political_discussion_board_tag";
import { generate_random_economic_political_discussion_board_admin_tags_create } from "../../../generate/generate_random_economic_political_discussion_board_admin_tags_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_tag_update_long_name(connection: api.IConnection): Promise<void> {
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: typia.random<IEconomicPoliticalDiscussionBoardAdmin.IJoin>(),
    });
    const createdTag = await generate_random_economic_political_discussion_board_admin_tags_create(adminConnection, {
        body: {
            name: 'finance',
        },
    });
    typia.assert(createdTag);
    const updatedTag = await api.functional.economicPoliticalDiscussionBoard.admin.tags.update(adminConnection, {
        tagId: createdTag.id,
        body: {
            name: 'economic-policy-analysis',
        },
    });
    typia.assert(updatedTag);
    TestValidator.equals('tag name updated', updatedTag.name, 'economic-policy-analysis');
    TestValidator.notEquals('timestamp updated', createdTag.updated_at, updatedTag.updated_at);
    TestValidator.equals('id unchanged', updatedTag.id, createdTag.id);
    TestValidator.equals('created_at unchanged', updatedTag.created_at, createdTag.created_at);
    TestValidator.equals('deleted_at unchanged', updatedTag.deleted_at, createdTag.deleted_at);
}