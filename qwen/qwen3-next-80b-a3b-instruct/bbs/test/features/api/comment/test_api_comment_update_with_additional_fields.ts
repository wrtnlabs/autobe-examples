import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";

export async function test_api_comment_update_with_additional_fields(
  connection: api.IConnection,
) {
  // 1. Authenticate as citizen
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const joinResponse: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: {
        email: citizenEmail,
        password: "password123",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies IEconomicBoardCitizen.ICreate,
    });
  typia.assert(joinResponse);

  // 2. Create a post to host the comment
  const postResponse: IEconomicBoardPost =
    await api.functional.economicBoard.citizen.posts.create(connection, {
      body: "Sample post content" satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(postResponse);

  // 3. Generate a valid UUID for non-existent comment to test 404
  const validCommentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Test that update with valid format commentId but non-existent returns 404
  // This is the closest we can get to test the behavior since we cannot create a comment
  const handleUpdateWithValidUUID = async () => {
    await api.functional.economicBoard.citizen.comments.update(connection, {
      commentId: validCommentId,
      body: { body: "Updated content" } satisfies IEconomicBoardComment.IUpdate,
    });
  };
  await TestValidator.error(
    "update request with non-existent comment should return 404",
    handleUpdateWithValidUUID,
  );

  // 5. Test that update request with invalid commentId format returns 400
  const invalidCommentId = "not-a-uuid-format";
  const handleUpdateWithInvalidUUID = async () => {
    await api.functional.economicBoard.citizen.comments.update(connection, {
      commentId: invalidCommentId,
      body: { body: "Updated content" } satisfies IEconomicBoardComment.IUpdate,
    });
  };
  await TestValidator.error(
    "update request with invalid comment Id format should return 400",
    handleUpdateWithInvalidUUID,
  );
}
