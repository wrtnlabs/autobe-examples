import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_board_citizen_articles_comments_create } from "../../../generate/generate_random_economic_board_citizen_articles_comments_create";
import { prepare_random_economic_board_comment } from "../../../prepare/prepare_random_economic_board_comment";

export async function test_api_comment_update_within_edit_window(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create citizen account with random credentials
  const citizenConnection: api.IConnection = { host: connection.host };
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IEconomicBoardCitizen.IJoin;
  await authorize_citizen_join(citizenConnection, { body: joinData });
  // 2. Login to obtain authenticated connection
  const loginData = {
    email: joinData.email,
    password: joinData.password,
  } satisfies IEconomicBoardCitizen.ILogin;
  const loginResponse = await authorize_citizen_login(citizenConnection, {
    body: loginData,
  });
  // 3. Create a comment on an article - we need an articleId
  // Since we cannot create an article (endpoint not available),
  // we assume there is an existing article and generate a random UUID
  // This is a workaround since the scenario mandates a comment on an article
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Use the utility function to create a comment on the article
  const commentData = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IEconomicBoardComment.ICreate;
  // The utility function returns an IEconomicBoardComment, which is empty type, so we use typia.assert to get correct properties
  const createdComment =
    await generate_random_economic_board_citizen_articles_comments_create(
      citizenConnection,
      {
        body: commentData,
        params: { articleId },
      },
    );
  // typia.assert with interface to expose properties
  interface Comment {
    id: string & tags.Format<"uuid">;
    economic_board_articles_id: string & tags.Format<"uuid">;
    economic_board_users_id: string & tags.Format<"uuid">;
    content: string;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
    deleted_at: string | null;
    deleted_by_admin: boolean;
    deletion_reason: string | null;
  }
  const commentTyped: Comment = typia.assert<Comment>(createdComment);
  // 4. Update the comment within the 60-minute edit window
  const updatedContent = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEconomicBoardComment.IUpdate;
  const updatedComment =
    await api.functional.economicBoard.citizen.comments.update(
      citizenConnection,
      {
        commentId: commentTyped.id,
        body: updatedContent,
      },
    );
  // Assert the updated comment has correct structure
  const updatedCommentTyped: Comment = typia.assert<Comment>(updatedComment);
  // 5. Validate updated properties according to API specification
  TestValidator.equals(
    "comment content updated",
    updatedCommentTyped.content,
    updatedContent.content,
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedCommentTyped.updated_at) >
      new Date(commentTyped.created_at),
  );
  TestValidator.equals(
    "comment id unchanged",
    updatedCommentTyped.id,
    commentTyped.id,
  );
  TestValidator.equals(
    "user id remains the author",
    updatedCommentTyped.economic_board_users_id,
    loginResponse.id,
  );
  // Validate that created_at was preserved
  TestValidator.equals(
    "created_at preserved",
    updatedCommentTyped.created_at,
    commentTyped.created_at,
  );
}
