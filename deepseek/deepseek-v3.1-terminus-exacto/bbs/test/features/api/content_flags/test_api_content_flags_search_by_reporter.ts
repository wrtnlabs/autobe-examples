import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";

/**
 * Test reporter-based filtering to support investigations and user behavior tracking.
 */
export async function test_api_content_flags_search_by_reporter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator account
  const adminJoinEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminJoinEmail,
      password: adminJoinPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminJoinResponse);
  // 2. Setup reporter user account
  const reporterJoinEmail = typia.random<string & tags.Format<"email">>();
  const reporterJoinPassword = RandomGenerator.alphaNumeric(16);
  const reporterJoinConnection: api.IConnection = { host: connection.host };
  const reporterJoinResponse = await authorize_user_join(
    reporterJoinConnection,
    {
      body: {
        email: reporterJoinEmail,
        password: reporterJoinPassword,
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(reporterJoinResponse);
  // 3. Create article for the reporter to flag (use reporter's login)
  const articleConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(articleConnection, {
    body: {
      email: reporterJoinEmail,
      password: reporterJoinPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  const article = await generate_random_discussion_board_user_articles_create(
    articleConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article);
  // 4. Create multiple content flags as the reporter
  const reporterFlagConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(reporterFlagConnection, {
    body: {
      email: reporterJoinEmail,
      password: reporterJoinPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  const flagCount = 3;
  const createdFlags: IDiscussionBoardContentFlag[] = [];
  for (let i = 0; i < flagCount; i++) {
    const flag =
      await generate_random_discussion_board_user_content_flags_create(
        reporterFlagConnection,
        {
          body: {
            flagged_article_id: article.id,
            flag_reason: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    typia.assert(flag);
    createdFlags.push(flag);
  }
  // 5. Administrator searches for flags by this reporter
  const adminSearchConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminSearchConnection, {
    body: {
      email: adminJoinEmail,
      password: adminJoinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  const pageValue = 1 satisfies number &
    tags.Type<"int32"> &
    tags.Default<1> &
    tags.Minimum<1> satisfies number as number;
  const limitValue = 20 satisfies number &
    tags.Type<"int32"> &
    tags.Default<20> &
    tags.Minimum<1> &
    tags.Maximum<100> satisfies number as number;
  const searchResult =
    await api.functional.discussionBoard.admin.content_flags.index(
      adminSearchConnection,
      {
        body: {
          reporter_user_id: reporterJoinResponse.id,
          page: pageValue,
          limit: limitValue,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(searchResult);
  // 6. Validate search results
  TestValidator.equals(
    "search returns correct number of flags",
    searchResult.data.length,
    flagCount,
  );
  for (const flagSummary of searchResult.data) {
    TestValidator.equals(
      "flag reporter matches",
      flagSummary.reporter.id,
      reporterJoinResponse.id,
    );
    // Verify flagged article matches
    if (flagSummary.flaggedArticle) {
      TestValidator.equals(
        "flagged article matches",
        flagSummary.flaggedArticle.id,
        article.id,
      );
    }
  }
  // 7. Test edge case: search for reporter with no flags
  const otherReporterJoinEmail = typia.random<string & tags.Format<"email">>();
  const otherReporterJoinPassword = RandomGenerator.alphaNumeric(16);
  const otherReporterConnection: api.IConnection = { host: connection.host };
  const otherReporterJoinResponse = await authorize_user_join(
    otherReporterConnection,
    {
      body: {
        email: otherReporterJoinEmail,
        password: otherReporterJoinPassword,
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(otherReporterJoinResponse);
  const emptySearchResult =
    await api.functional.discussionBoard.admin.content_flags.index(
      adminSearchConnection,
      {
        body: {
          reporter_user_id: otherReporterJoinResponse.id,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "search for reporter with no flags returns empty",
    emptySearchResult.data.length,
    0,
  );
  // Removing the problematic line that tries to access undefined pagination properties
}
