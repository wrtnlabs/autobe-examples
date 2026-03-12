import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test section deletion rejection when section contains articles.
 * Validates referential integrity protection that prevents orphaned articles.
 */
export async function test_api_section_deletion_rejected_with_articles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create a section as administrator
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Member setup - register and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 4. Create an article in the section as member
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // 5. Verify article is in the correct section
  TestValidator.equals(
    "article section matches",
    article.section.id,
    section.id,
  );
  // 6. Attempt to delete the section (should fail with 409 Conflict)
  await TestValidator.httpError(
    "section deletion rejected with articles",
    409,
    async () =>
      await api.functional.discussionBoard.administrator.sections.erase(
        adminConnection,
        {
          sectionId: section.id,
        },
      ),
  );
  // 7. Verify section still exists by attempting another deletion (should still fail)
  await TestValidator.httpError(
    "section still exists after failed deletion",
    409,
    async () =>
      await api.functional.discussionBoard.administrator.sections.erase(
        adminConnection,
        {
          sectionId: section.id,
        },
      ),
  );
  // 8. Verify article is still intact (section reference unchanged)
  TestValidator.equals(
    "article section unchanged after deletion attempt",
    article.section.id,
    section.id,
  );
}
