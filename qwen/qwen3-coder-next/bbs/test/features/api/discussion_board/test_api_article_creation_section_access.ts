import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_creation_section_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super admin user
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(superAdminConnection);
  // 2. Create a valid section using super admin
  const section =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSection.ICreate>(),
      },
    );
  typia.assert(section);
  // 3. Setup: Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.member.join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  typia.assert(memberConnection);
  // 4. Test Case 1: Create article in valid existing section (should succeed)
  const validArticle =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId: section.id,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(validArticle);
  TestValidator.equals(
    "article section matches",
    validArticle.section.id,
    section.id,
  );
  // 5. Test Case 2: Create article with non-existent section ID (should fail)
  const nonExistentSectionId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error("non-existent section should fail", async () => {
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId: nonExistentSectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  });
  // 6. Test Case 3: Create article with invalid UUID format section ID (should fail)
  await TestValidator.error("invalid UUID format should fail", async () => {
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId: "invalid-uuid-format",
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  });
}
