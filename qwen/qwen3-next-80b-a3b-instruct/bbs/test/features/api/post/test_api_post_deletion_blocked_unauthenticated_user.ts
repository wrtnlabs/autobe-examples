import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";

export async function test_api_post_deletion_blocked_unauthenticated_user(
  connection: api.IConnection,
) {
  // 1. Create an unauthenticated connection by clearing all headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Generate a random post code to test deletion
  const postCode: string = RandomGenerator.alphaNumeric(20);

  // 3. Attempt to delete the post as an unauthenticated user - must fail with 401 Unauthorized regardless of post existence
  await TestValidator.error(
    "unauthenticated user cannot delete post regardless of existence",
    async () => {
      await api.functional.economicBoard.moderator.posts.erase(
        unauthConnection,
        {
          postCode: postCode,
        },
      );
    },
  );

  // 4. Also verify that deletion of a non-existent post code returns same 401 error (anti-enumeration check)
  const nonExistentPostCode: string = RandomGenerator.alphaNumeric(20);
  await TestValidator.error(
    "unauthenticated user cannot delete non-existent post (anti-enumeration)",
    async () => {
      await api.functional.economicBoard.moderator.posts.erase(
        unauthConnection,
        {
          postCode: nonExistentPostCode,
        },
      );
    },
  );
}
