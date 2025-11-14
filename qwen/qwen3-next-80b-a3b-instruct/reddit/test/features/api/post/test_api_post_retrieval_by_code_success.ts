import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_retrieval_by_code_success(
  connection: api.IConnection,
) {
  const communityCode = typia.random<string>() satisfies string &
    tags.Pattern<"^\\w+">;
  const postCode = typia.random<string>() satisfies string &
    tags.Pattern<"^\\w+">;

  // Generate expected post data using typia.random "validation" since we can't create a post
  const expectedPost: ICommunityPlatformPost =
    typia.random<ICommunityPlatformPost>();

  // Mock the response by overriding the connection for simulation mode
  const mockConnection: api.IConnection = {
    ...connection,
    simulate: true,
  };

  // Retrieve the post by code
  const retrievedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.communities.posts.at(
      mockConnection,
      {
        communityCode: communityCode,
        postCode: postCode,
      },
    );

  // Validate the returned data matches expected structure
  typia.assert(retrievedPost);

  // Validate that the simulated response matches the generated expected data
  TestValidator.equals(
    "retrieved post matches expected structure",
    retrievedPost,
    expectedPost,
  );
}
