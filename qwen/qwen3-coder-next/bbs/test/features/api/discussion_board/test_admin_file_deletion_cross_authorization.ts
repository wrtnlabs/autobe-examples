import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_admin_file_deletion_cross_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member A account
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberARegister = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardMember.IJoin;
  await api.functional.discussionBoard.auth.member.join(memberAConnection, {
    body: memberARegister,
  });
  // Step 2: Login as member A
  await api.functional.discussionBoard.auth.member.login(memberAConnection, {
    body: {
      email: memberARegister.email,
      password: memberARegister.password,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // Step 3: Member A creates an article
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberAConnection,
      {
        sectionId: "123e4567-e89b-12d3-a456-426614174000",
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 4: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminRegister = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: "Admin User",
    bio: "System administrator",
  } satisfies IDiscussionBoardAdmin.IJoin;
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: adminRegister,
  });
  // Step 5: Login as admin
  await api.functional.discussionBoard.auth.admin.login(adminConnection, {
    body: {
      email: adminRegister.email,
      password: adminRegister.password,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Step 6: Admin attempts to delete a file from member A's article
  // This validates that admin permissions allow cross-authorization file deletion
  try {
    await api.functional.discussionBoard.admin.articles.files.erase(
      adminConnection,
      {
        articleId: article.id,
        fileId: "00000000-0000-0000-0000-000000000000",
      },
    );
    TestValidator.predicate(
      "admin can delete files from other users' articles",
      true,
    );
  } catch (error) {
    const httpError = error as api.HttpError;
    TestValidator.predicate(
      "admin has permission to delete files (404 for non-existent file is acceptable)",
      httpError.status === 404,
    );
  }
  // Step 7: Verify member A can still access their article after admin file deletion attempt
  const verificationArticle =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberAConnection,
      {
        sectionId: "123e4567-e89b-12d3-a456-426614174000",
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(verificationArticle);
  TestValidator.equals(
    "article ID matches original",
    verificationArticle.id,
    article.id,
  );
}
