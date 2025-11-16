import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

export async function test_api_pending_articles_without_authentication(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection without any authorization headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt to access the pending articles endpoint without authentication
  // This should fail with an authorization error
  await TestValidator.error(
    "pending articles endpoint should reject unauthenticated access",
    async () => {
      await api.functional.discussionBoard.moderator.moderation.pending_articles.index(
        unauthConn,
        {
          body: {
            q: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    },
  );
}
