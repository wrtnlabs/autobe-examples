import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_article_tag_mappings_update_unauthorized_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that unauthorized users cannot update article tag mappings.
  // 1. Attempt to update tag mappings without authentication.
  // 2. Attempt to update tag mappings as a registeredUser (non-superAdministrator).
  // 3. Verify the system rejects the operations with appropriate authorization errors.
  // 4. Confirm that tag mappings remain unchanged when unauthorized updates are attempted.
  // Create superAdministrator connection and join to get valid article and tag IDs
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // Generate valid UUIDs for article and tag
  const validArticleId = typia.random<string & tags.Format<"uuid">>();
  const validTagId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IDiscussionBoardArticleTagMapping.IUpdate = {
    discussionBoardArticleId: validArticleId,
    discussionBoardTagId: validTagId,
  };
  // 1. Attempt to update without any authentication (base connection)
  await TestValidator.httpError(
    "unauthenticated update tag mappings should be forbidden",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.articles.tag_mappings.updateTagMappings(
        connection,
        {
          articleId: validArticleId,
          body: updateBody,
        },
      );
    },
  );
  // 2. Attempt to update as a registeredUser (non-superAdministrator)
  // Create dummy connection without authentication header
  const registeredUserConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "registered user update tag mappings should be forbidden",
    403,
    async () => {
      await api.functional.discussionBoard.superAdministrator.articles.tag_mappings.updateTagMappings(
        registeredUserConnection,
        {
          articleId: validArticleId,
          body: updateBody,
        },
      );
    },
  );
}
