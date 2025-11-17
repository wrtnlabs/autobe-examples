import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAttachment";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_anonymous_cannot_upload_attachment(
  connection: api.IConnection,
) {
  const citizen = await api.functional.auth.citizen.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies IEconomicBoardCitizen.ICreate,
  });
  typia.assert(citizen);

  // Create a valid UUID for postId - since we cannot create a post (no IEconomicBoardPost defined), use random UUID as per scenario 'no existing post'
  const postId = typia.random<string & tags.Format<"uuid">>();

  // Switch to unauthenticated connection by creating a new connection with empty headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Attempt to upload attachment without authentication - should fail with 401
  await TestValidator.error("anonymous access should be rejected", async () => {
    await api.functional.economicBoard.citizen.posts.attachments.create(
      unauthConnection,
      {
        postId,
        body: "SGVsbG8gd29ybGQh" satisfies IEconomicBoardAttachment.ICreate,
      },
    );
  });
}
