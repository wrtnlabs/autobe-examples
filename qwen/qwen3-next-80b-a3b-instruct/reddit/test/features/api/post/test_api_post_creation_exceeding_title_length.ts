import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";
import type { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";

export async function test_api_post_creation_exceeding_title_length(
  connection: api.IConnection,
) {
  // 1. Create a citizen account for authentication
  const email = typia.random<string & tags.Format<"email">>();
  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: email satisfies ICommunityBBSCitizenICreate,
    });
  typia.assert(citizen);

  // 2. Check that the citizen is authenticated by verifying the token is set in connection
  TestValidator.predicate(
    "citizen is authenticated",
    connection.headers?.Authorization != null,
  );

  // 3. Create a post with a title exceeding 200 characters
  const longTitle = RandomGenerator.paragraph({
    sentences: 50,
    wordMin: 5,
    wordMax: 10,
  });
  // Verify that the title exceeds 200 characters
  TestValidator.predicate(
    "title exceeds 200 characters",
    longTitle.length > 200,
  );

  // 4. Verify that the system rejects the post creation with excessive title length
  // Since ICommunityBBSPost.ICreate is defined as string, we use the long title as the body
  await TestValidator.error(
    "post creation with title exceeding 200 characters should fail",
    async () => {
      await api.functional.communityBBS.citizen.posts.create(connection, {
        body: longTitle satisfies ICommunityBBSPost.ICreate,
      });
    },
  );
}
