import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";
import type { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";

export async function test_api_post_creation_with_empty_body(
  connection: api.IConnection,
) {
  // Step 1: Create a new citizen account for authentication
  const citizenEmail: string = typia.random<string & tags.Format<"email">>();
  const citizenPassword: string = "SecurePass123!";
  const citizenBody = JSON.stringify({
    email: citizenEmail,
    password: citizenPassword,
    username: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  });

  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: citizenBody,
    });
  typia.assert(citizen);

  // Step 2: Create a post with only a title and empty body
  const postTitle: string = RandomGenerator.paragraph({ sentences: 3 });
  const communityId: string = typia.random<string & tags.Format<"uuid">>();
  const postBody = JSON.stringify({
    title: postTitle,
    body: "",
    community_id: communityId,
  });

  const post: ICommunityBBSPost =
    await api.functional.communityBBS.citizen.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // Step 3: Validate the created post
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals("post body is empty", post.body, "");
  TestValidator.predicate("post has status", post.status !== undefined);
  TestValidator.predicate("post has author", post.author !== undefined);
  TestValidator.predicate("post has community", post.community !== undefined);
}
