import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_posts_non_existent_community(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Attempt to retrieve posts using a non-existent communityId.
  // The test authenticates a user, creates a community, then calls the endpoint
  // with a random UUID not matching any known community. The expected output is
  // a paginated response with an empty post data array and correct pagination
  // metadata indicating no data. This tests the system's graceful handling of unknown identifiers.
  // 1. Authenticate user by joining
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, { body: {} });
  // 2. Create a community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Create a random UUID that does not match any existing community
  let randomCommunityId = typia.random<string & tags.Format<"uuid">>();
  // Ensure the randomCommunityId is not the one just created
  if (randomCommunityId === (community as any).id) {
    // Regenerate if collision occurs (extremely rare)
    const anotherUuid = typia.random<string & tags.Format<"uuid">>();
    if (anotherUuid !== (community as any).id) {
      randomCommunityId = anotherUuid;
    }
  }
  // 4. Call the endpoint with the non-existent communityId
  const response =
    await api.functional.communityPlatform.user.communities.posts.index(
      userConnection,
      { communityId: randomCommunityId },
    );
  // 5. Validate response structure and contents
  typia.assert(response);
  // Expected: data array is empty
  TestValidator.equals("Data array length", response.data.length, 0);
  // Expected: pagination metadata shows zero records and pages
  TestValidator.equals(
    "Pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("Pagination limit", response.pagination.limit, 0);
  TestValidator.equals("Pagination records", response.pagination.records, 0);
  TestValidator.equals("Pagination pages", response.pagination.pages, 0);
}
