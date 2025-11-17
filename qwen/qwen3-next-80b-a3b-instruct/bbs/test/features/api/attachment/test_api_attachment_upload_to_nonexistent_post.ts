import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAttachment";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";

export async function test_api_attachment_upload_to_nonexistent_post(
  connection: api.IConnection,
) {
  // Authenticate moderator
  const moderator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Attempt upload to non-existent post with valid UUID format (but non-existent ID)
  await TestValidator.error(
    "uploading attachment to non-existent post should return 404",
    async () => {
      await api.functional.economicBoard.moderator.posts.attachments.create(
        connection,
        {
          postId: "00000000-0000-0000-0000-000000000000", // Valid UUID format, non-existent resource
          body: typia.random<string>() satisfies IEconomicBoardAttachment.ICreate,
        },
      );
    },
  );
}
