import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdmin";
import type { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { prepare_random_economic_political_discussion_board_section } from "../../../prepare/prepare_random_economic_political_discussion_board_section";
import { generate_random_economic_political_discussion_board_admin_sections_create } from "../../../generate/generate_random_economic_political_discussion_board_admin_sections_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_section_update_with_name_only(connection: api.IConnection): Promise<void> {
    // 1. Admin authentication
    const adminConnection: api.IConnection = { host: connection.host };
    const authResult = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            href: "http://localhost",
            referrer: "http://localhost",
        }
    });
    // 2. Create section to update
    const originalSection = await generate_random_economic_political_discussion_board_admin_sections_create(adminConnection, {
        body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
        }
    });
    typia.assert(originalSection);
    // 3. Save original metadata
    const originalDescription = originalSection.description;
    const originalUpdatedAt = originalSection.updated_at;
    // 4. Update section name only
    const newName = RandomGenerator.name();
    const updatedSection = await api.functional.economicPoliticalDiscussionBoard.admin.sections.update(adminConnection, {
        id: originalSection.id,
        body: {
            name: newName,
        }
    });
    typia.assert(updatedSection);
    // 5. Verify description unchanged
    TestValidator.equals("description unchanged", updatedSection.description, originalDescription);
    // 6. Verify updated_at changed
    TestValidator.notEquals("updated_at changed", updatedSection.updated_at, originalUpdatedAt);
}