import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { generate_random_discussion_board_member_tags_create } from "../../../generate/generate_random_discussion_board_member_tags_create";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

/**
 * Test that searching for articles by a tag that exists but has no articles returns an empty result set.
 *
 * This test verifies that when a tag is created but no articles are assigned to it,
 * the tag-based article search returns an empty result with proper pagination metadata.
 */
export async function test_api_tag_article_search_empty_result(
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
  // 2. Create a new tag that will have no articles
  const tag = await generate_random_discussion_board_member_tags_create(
    memberConnection,
    {
      body: {
        name: "unused-tag-" + typia.random<string & tags.Format<"uuid">>(),
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag);
  // 3. Search for articles by the unused tag
  const result =
    await api.functional.discussionBoard.tags.articles.patchByTagid(
      memberConnection,
      {
        tagId: tag.id,
        body: {} satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(result);
  // 4. Verify the result is empty
  TestValidator.equals("data array is empty", result.data.length, 0);
  TestValidator.equals("pagination records is 0", result.pagination.records, 0);
  TestValidator.equals("pagination pages is 0", result.pagination.pages, 0);
  TestValidator.predicate(
    "current page is valid",
    result.pagination.current >= 0,
  );
}
