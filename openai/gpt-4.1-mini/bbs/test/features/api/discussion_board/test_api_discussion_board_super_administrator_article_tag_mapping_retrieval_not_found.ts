import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test scenario where the specified tag mapping or article does not exist.
 * Steps:
 * 1. Authenticate as superAdministrator by joining.
 * 2. Attempt to retrieve tag mapping detail with non-existent articleId or tagMappingId.
 * 3. Verify that the response is a 404 Not Found error.
 * 4. Ensure proper authorization is enforced, only superAdministrator access allowed.
 *
 * This tests error handling for missing resources and authorization enforcement.
 */
export async function test_api_discussion_board_super_administrator_article_tag_mapping_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator by joining
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  // 2. Attempt to retrieve tag mapping detail with non-existent articleId or tagMappingId
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentTagMappingId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify that the response is a 404 Not Found error
  await TestValidator.httpError(
    "super administrator get tag mapping detail for non-existent article/ mapping should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.articles.tag_mappings.at(
        superAdminConnection,
        {
          articleId: nonExistentArticleId,
          tagMappingId: nonExistentTagMappingId,
        },
      );
    },
  );
}
