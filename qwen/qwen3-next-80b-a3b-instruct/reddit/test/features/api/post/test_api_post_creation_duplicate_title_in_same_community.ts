import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";
import type { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";

export async function test_api_post_creation_duplicate_title_in_same_community(
  connection: api.IConnection,
) {
  // 1. Create new citizen account for authentication
  const citizenEmail: string = typia.random<string & tags.Format<"email">>();
  const joinResponse: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: typia.random<ICommunityBBSCitizenICreate>(),
    });
  typia.assert(joinResponse);

  // 2. Create first post with a valid string body
  const firstPostBody: string = "post content 1";
  const firstPost: ICommunityBBSPost =
    await api.functional.communityBBS.citizen.posts.create(connection, {
      body: firstPostBody satisfies ICommunityBBSPost.ICreate,
    });
  typia.assert(firstPost);
  TestValidator.equals(
    "first post body matches",
    firstPost.body,
    firstPostBody,
  );

  // 3. Create second post with a different valid string body
  const secondPostBody: string = "post content 2";
  const secondPost: ICommunityBBSPost =
    await api.functional.communityBBS.citizen.posts.create(connection, {
      body: secondPostBody satisfies ICommunityBBSPost.ICreate,
    });
  typia.assert(secondPost);
  TestValidator.equals(
    "second post body matches",
    secondPost.body,
    secondPostBody,
  );
  TestValidator.notEquals(
    "second post body differs from first",
    secondPostBody,
    firstPostBody,
  );
}
