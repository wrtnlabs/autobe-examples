import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_snapshot_content_moderation_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // 2. Create admin account and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 3. Create a section using utility function
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(section);
  // 4. Create a user and login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResult = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Login user to maintain session
  const userLoginConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userLoginConnection, {
    body: {
      email: userJoinResult.email,
      password: "1234",
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // 5. Create an article with initial content using utility function
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialContent = RandomGenerator.content({ paragraphs: 2 });
  const article = await generate_random_discussion_board_user_articles_create(
    userLoginConnection,
    {
      body: {
        title: initialTitle,
        content: initialContent,
        discussion_board_section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // 6. Update article multiple times to generate snapshots
  const update1Title = RandomGenerator.paragraph({ sentences: 2 });
  const update1Content = RandomGenerator.content({ paragraphs: 2 });
  await api.functional.discussionBoard.user.articles.update(
    userLoginConnection,
    {
      articleId: article.id,
      body: {
        title: update1Title,
        content: update1Content,
      } satisfies IDiscussionBoardArticle.IUpdate,
    },
  );
  const update2Title = RandomGenerator.paragraph({ sentences: 2 });
  const update2Content = RandomGenerator.content({ paragraphs: 2 });
  await api.functional.discussionBoard.user.articles.update(
    userLoginConnection,
    {
      articleId: article.id,
      body: {
        title: update2Title,
        content: update2Content,
      } satisfies IDiscussionBoardArticle.IUpdate,
    },
  );
  // 7. Retrieve all snapshots for the article
  const snapshots =
    await api.functional.discussionBoard.superAdmin.articles.snapshots.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.equals(
    "should have multiple snapshots",
    true,
    snapshots.data.length >= 3,
  );
  // 8. Retrieve the earliest snapshot (original content)
  const earliestSnapshot = snapshots.data[0];
  const snapshotDetail =
    await api.functional.discussionBoard.superAdmin.articles.snapshots.at(
      superAdminConnection,
      {
        articleId: article.id,
        snapshotId: earliestSnapshot.id,
      },
    );
  typia.assert(snapshotDetail);
  // 9. Verify the snapshot contains original content, not current version
  TestValidator.equals(
    "snapshot title should match initial title",
    snapshotDetail.title,
    initialTitle,
  );
  TestValidator.equals(
    "snapshot content should match initial content",
    snapshotDetail.content,
    initialContent,
  );
  TestValidator.notEquals(
    "snapshot title should not match current title",
    snapshotDetail.title,
    update2Title,
  );
  TestValidator.notEquals(
    "snapshot content should not match current content",
    snapshotDetail.content,
    update2Content,
  );
  // 10. Verify snapshot metadata
  TestValidator.equals(
    "snapshot article_id should match original article",
    snapshotDetail.article_id,
    article.id,
  );
  TestValidator.equals(
    "snapshot author should match article author",
    snapshotDetail.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "snapshot section should match article section",
    snapshotDetail.section.id,
    article.section.id,
  );
}