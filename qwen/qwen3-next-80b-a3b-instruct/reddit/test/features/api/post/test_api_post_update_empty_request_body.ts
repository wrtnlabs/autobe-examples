import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";
import type { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";

export async function test_api_post_update_empty_request_body(
  connection: api.IConnection,
) {
  // 1. Create a citizen account for authentication
  const citizenEmail: string = typia.random<string & tags.Format<"email">>();
  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: typia.random<ICommunityBBSCitizenICreate>(),
    });
  typia.assert(citizen);

  // 2. Create a post owned by the citizen
  // Since we can't create a community via provided APIs, use a dummy UUID for community_id
  const communityId: string = typia.random<string & tags.Format<"uuid">>();
  const post: ICommunityBBSPost =
    await api.functional.communityBBS.citizen.posts.create(connection, {
      body: JSON.stringify({
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_id: communityId,
      }),
    });
  typia.assert(post);

  // 3. Update the post with an empty request body (no fields to modify)
  // Empty object as JSON string
  const updatedPost: ICommunityBBSPost =
    await api.functional.communityBBS.citizen.posts.update(connection, {
      postId: post.id,
      body: JSON.stringify({}),
    });
  typia.assert(updatedPost);

  // 4. Verify the post was not modified (title and body unchanged)
  TestValidator.equals(
    "post title unchanged after empty update",
    updatedPost.title,
    post.title,
  );
  TestValidator.equals(
    "post body unchanged after empty update",
    updatedPost.body,
    post.body,
  );
  TestValidator.equals(
    "post id unchanged after empty update",
    updatedPost.id,
    post.id,
  );
  TestValidator.equals(
    "post author unchanged after empty update",
    updatedPost.author.id,
    post.author.id,
  );

  // 5. Verify updated_at timestamp was updated (the only expected change)
  TestValidator.notEquals(
    "updated_at timestamp should be newer after empty update",
    updatedPost.updated_at,
    post.updated_at,
  );
  // Note: The system should automatically update updated_at when a post is updated
  // even if no fields were modified, as per the scenario requirement
}
