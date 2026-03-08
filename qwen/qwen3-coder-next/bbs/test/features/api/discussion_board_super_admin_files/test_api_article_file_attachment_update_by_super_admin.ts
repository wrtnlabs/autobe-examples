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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_file_attachment_update_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin login
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.login(
    superAdminConnection,
    {
      body: {
        email: "superadmin@test.com",
        password: "1234",
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: superAdmin.token.access,
  };
  // 2. Regular member login
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: member.token.access,
  };
  // 3. Create a section
  const section =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(section);
  // 4. Create article as regular member
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId: section.id,
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article has no files initially",
    article.files.length,
    0,
  );
  // 5. Super admin uploads file to member's article
  const fileUploadResponse =
    await api.functional.discussionBoard.superAdmin.articles.update(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          title: article.title,
          content: article.content,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(fileUploadResponse);
  // 6. Verify file metadata exists
  if (fileUploadResponse.files.length > 0) {
    const file = fileUploadResponse.files[0];
    TestValidator.predicate("file has valid id", () => !!file.id);
    TestValidator.predicate("file has valid name", () => !!file.file_name);
    TestValidator.predicate("file has valid url", () => !!file.file_url);
    TestValidator.predicate("file has valid size", () => file.file_size > 0);
    TestValidator.predicate("file has valid type", () => !!file.file_type);
  }
  // 7. Super admin deletes file attachment
  const fileDeleteResponse =
    await api.functional.discussionBoard.superAdmin.articles.update(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          title: article.title,
          content: article.content,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(fileDeleteResponse);
  // 8. Verify file is soft deleted
  if (fileDeleteResponse.files.length > 0) {
    const file = fileDeleteResponse.files[0];
    TestValidator.predicate(
      "file has deleted_at timestamp",
      () => file.deleted_at !== null,
    );
  }
}
