import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that searching for articles by a non-existent tag returns 404 error.
 *
 * This test verifies that the tag-based article search endpoint properly
 * validates tag existence and returns appropriate error responses when
 * querying with invalid tag identifiers.
 */
export async function test_api_tag_article_search_invalid_tag(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Generate a non-existent tag ID (valid UUID format but doesn't exist)
  const invalidTagId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to search articles with invalid tag ID
  // Should throw HttpError with status 404
  await TestValidator.httpError(
    "non-existent tag returns 404",
    404,
    async () =>
      await api.functional.discussionBoard.tags.articles.patchByTagid(
        memberConnection,
        {
          tagId: invalidTagId,
          body: {} satisfies IDiscussionBoardArticle.IRequest,
        },
      ),
  );
}
