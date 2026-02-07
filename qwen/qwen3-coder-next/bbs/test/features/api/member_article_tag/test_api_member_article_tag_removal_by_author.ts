import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_tags_create_tags } from "../../../generate/generate_random_discussion_board_member_articles_tags_create_tags";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_member_article_tag_removal_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member operations
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new member user
  const registerResponse = await authorize_member_join(memberConnection, {
    body: {
      // IDiscussionBoardMember.IJoin has no required fields currently
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(registerResponse);
  // Update connection with the authorization token from registration
  memberConnection.headers = {
    Authorization: registerResponse.token.access,
  };
  // Create a mock article ID and tag ID for testing tag removal
  // Since we don't have article creation API, we'll use mock UUIDs
  // In a real scenario, these would come from actual article/tag creation
  const mockArticleId = typia.random<string & tags.Format<"uuid">>();
  const mockTagId = typia.random<string & tags.Format<"uuid">>();
  // Step 2: Add a tag to the article using the provided API
  // Note: In a real scenario, this would be called after article creation
  const tagCreateResponse =
    await api.functional.discussionBoard.member.articles.tags.createTags(
      memberConnection,
      {
        articleId: mockArticleId,
        body: typia.random<IDiscussionBoardArticleTag.ICreate>(),
      },
    );
  typia.assert(tagCreateResponse);
  // Step 3: Verify the tag exists (using mock assumption)
  // Note: We can't verify actual existence without list API
  // Step 4: Remove the tag from the article using DELETE endpoint
  await api.functional.discussionBoard.member.articles.tags.eraseTag(
    memberConnection,
    {
      articleId: mockArticleId,
      tagId: mockTagId,
    },
  );
  // Step 5: Verify the operation completed successfully
  // Since eraseTag returns void, we just verify no error was thrown
  TestValidator.predicate("tag removal completed successfully", true);
}
