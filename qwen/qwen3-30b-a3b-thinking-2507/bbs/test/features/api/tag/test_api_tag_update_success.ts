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
export async function test_api_tag_update_success(connection: api.IConnection): Promise<void> {
    // 1. Admin login
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            href: "http://localhost",
            referrer: "http://localhost",
        },
    });
    // 2. Create initial tag with name "politics"
    const initialTag = await generate_random_economic_political_discussion_board_admin_tags_create(adminConnection, {
        body: {
            name: "politics",
        } satisfies IEconomicPoliticalDiscussionBoardTag.ICreate,
    });
    typia.assert(initialTag);
    // 3. Update tag name to "economy"
    const updatedTag = await api.functional.economicPoliticalDiscussionBoard.admin.tags.update(adminConnection, {
        tagId: initialTag.id,
        body: {
            name: "economy",
        } satisfies IEconomicPoliticalDiscussionBoardTag.IUpdate,
    });
    typia.assert(updatedTag);
    // 4. Validate results
    TestValidator.equals("tag name updated", updatedTag.name, "economy");
    TestValidator.predicate("updated_at is newer", updatedTag.updated_at > initialTag.updated_at);
    TestValidator.equals("id unchanged", updatedTag.id, initialTag.id);
    TestValidator.equals("deleted_at unchanged", updatedTag.deleted_at, initialTag.deleted_at);
}