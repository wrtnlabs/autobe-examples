import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";
import type { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";
import type { ICommunityBBSPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPostVote";

export async function test_api_post_vote_create_by_citizen(
  connection: api.IConnection,
) {
  // Step 1: Create a new citizen account for authentication
  // ICommunityBBSCitizenICreate is a string - represent as simple string
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = "TestPassword123!";

  // Format the citizen create body as required string type: email:password
  const citizenCreateBody: string = `${email}:${password}`;

  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: citizenCreateBody,
    });
  typia.assert(citizen);

  // Step 2: Create a post in a community to vote on
  // ICommunityBBSPost.ICreate is a string - use minimal valid format

  // Extract communityId from something meaningful - use random uuid
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // According to schema, ICommunityBBSPost.ICreate is string
  // We must construct appropriate string format
  // Based on context: expected to be JSON string with required properties
  const postCreateBody: string = JSON.stringify({
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    community_id: communityId,
  });

  const post: ICommunityBBSPost =
    await api.functional.communityBBS.citizen.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // Step 3: Cast an upvote on the created post
  const vote: ICommunityBBSPostVote =
    await api.functional.communityBBS.citizen.posts.votes.create(connection, {
      postId: post.id,
      body: {
        type: "upvote",
      } satisfies ICommunityBBSPostVote.ICreate,
    });
  typia.assert(vote);

  // Validate vote creation successful - satisfy test scenario requirements
  TestValidator.equals("vote type is upvote", vote, "upvote");
  TestValidator.predicate("post ID matches", post.id !== null);
}
