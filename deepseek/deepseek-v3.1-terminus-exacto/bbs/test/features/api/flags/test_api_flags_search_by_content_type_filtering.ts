import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_flags_search_by_content_type_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Search for existing flags with different content types
  const allFlags = await api.functional.discussionBoard.superAdmin.flags.index(
    superAdminConnection,
    {
      body: {
        status: "pending",
        limit: 100,
      } satisfies IDiscussionBoardContentFlag.IRequest,
    },
  );
  typia.assert(allFlags);
  // Separate article and comment flags from existing data
  const articleFlags = allFlags.data.filter(
    (flag) => flag.flaggedArticle !== null && flag.flaggedComment === null,
  );
  const commentFlags = allFlags.data.filter(
    (flag) => flag.flaggedComment !== null && flag.flaggedArticle === null,
  );
  // Test article-only filtering if article flags exist
  if (articleFlags.length > 0) {
    const articleOnlyResults =
      await api.functional.discussionBoard.superAdmin.flags.index(
        superAdminConnection,
        {
          body: {
            flagged_article_id: articleFlags[0].flaggedArticle!.id,
          } satisfies IDiscussionBoardContentFlag.IRequest,
        },
      );
    typia.assert(articleOnlyResults);
    TestValidator.predicate(
      "article-only results should contain article flags",
      articleOnlyResults.data.every(
        (flag) => flag.flaggedArticle !== null && flag.flaggedComment === null,
      ),
    );
  }
  // Test comment-only filtering if comment flags exist
  if (commentFlags.length > 0) {
    const commentOnlyResults =
      await api.functional.discussionBoard.superAdmin.flags.index(
        superAdminConnection,
        {
          body: {
            flagged_comment_id: commentFlags[0].flaggedComment!.id,
          } satisfies IDiscussionBoardContentFlag.IRequest,
        },
      );
    typia.assert(commentOnlyResults);
    TestValidator.predicate(
      "comment-only results should contain comment flags",
      commentOnlyResults.data.every(
        (flag) => flag.flaggedComment !== null && flag.flaggedArticle === null,
      ),
    );
  }
  // Test mixed content type filtering
  const mixedResults =
    await api.functional.discussionBoard.superAdmin.flags.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(mixedResults);
  // Validate that mixed results contain both types
  TestValidator.predicate(
    "mixed results should contain both article and comment flags",
    mixedResults.data.some((flag) => flag.flaggedArticle !== null) ||
      mixedResults.data.some((flag) => flag.flaggedComment !== null),
  );
}
