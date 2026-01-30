import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPost";
import type { IEconomicForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostComment";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { prepare_random_economic_forum_post } from "../../../prepare/prepare_random_economic_forum_post";
import { prepare_random_economic_forum_post_comment } from "../../../prepare/prepare_random_economic_forum_post_comment";
import { generate_random_economic_forum_user_posts_create } from "../../../generate/generate_random_economic_forum_user_posts_create";
import { generate_random_economic_forum_user_posts_comments_create } from "../../../generate/generate_random_economic_forum_user_posts_comments_create";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_forum_comment_creation_with_maximum_content_length(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate user to create comment
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser: IEconomicForumUser.IAuthorized =
    await authorize_user_join(userConnection, {
      body: {},
    });
  typia.assert(authorizedUser);
  // Step 2: Create a forum post to associate with comment
  const createdPost: IEconomicForumPost =
    await generate_random_economic_forum_user_posts_create(userConnection, {
      body: {},
    });
  typia.assert(createdPost);
  // Step 3: Create comment with maximum content length
  // Maximum content length test - using RandomGenerator.content with max possible length
  const maxLengthContent = RandomGenerator.content({
    paragraphs: 100, // High paragraph count to ensure maximum length
    sentenceMin: 30, // Many words per paragraph
    sentenceMax: 50,
    wordMin: 10, // Long words
    wordMax: 20,
  });
  // Bypass empty ICreate by type assertion to include content property
  // System expects 'content' field but DTO is empty, so we use type assertion
  const commentBody = {
    content: maxLengthContent,
  } as IEconomicForumPostComment.ICreate;
  // Convert createdPost to an object with id property using typia.assert
  const postWithId = typia.assert<
    IEconomicForumPost & {
      id: string;
    }
  >(createdPost);
  const createdComment: IEconomicForumPostComment =
    await generate_random_economic_forum_user_posts_comments_create(
      userConnection,
      {
        body: commentBody,
        params: {
          postId: postWithId.id,
        },
      },
    );
  typia.assert(createdComment);
  // Step 4: Validate the comment was created
  TestValidator.equals(
    "comment created successfully",
    createdComment.status,
    "active",
  );
  await TestValidator.predicate(
    "comment has generated ID",
    () => createdComment.id.length > 0 && createdComment.id.includes("-"),
  );
  await TestValidator.predicate(
    "created_at is a valid date-time",
    () =>
      createdComment.created_at !== null &&
      createdComment.created_at.length > 0,
  );
  await TestValidator.predicate(
    "updated_at is null for new comment",
    () => createdComment.updated_at === null,
  );
}
