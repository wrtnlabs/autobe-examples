import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_registration(
  connection: api.IConnection,
) {
  // Generate a valid email address for moderator registration
  const email: string = typia.random<string & tags.Format<"email">>();

  // Register new moderator account with email as string body
  const result: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: email,
    });

  // Use typia.assert to validate the complete response structure and types
  // This ensures id is a valid UUID and token has correct structure with proper formats
  typia.assert(result);
}
