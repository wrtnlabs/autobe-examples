import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieval of a non-existent post returns 404 Not Found.
 *
 * Validates that the system properly handles requests for posts that were never created by returning an appropriate 404 error. This ensures the API correctly distinguishes between existing and non-existing resources.
 *
 * 1. Authenticate as a member to establish a valid connection
 * 2. Generate a random UUID that doesn't exist in the database
 * 3. Attempt to retrieve the non-existent post
 * 4. Verify the API returns 404 Not Found status code
 */
export async function test_api_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a random UUID that doesn't exist
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the non-existent post and verify 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent post",
    404,
    async () =>
      await api.functional.redditClone.posts.at(memberConnection, {
        postId: nonExistentPostId,
      }),
  );
}
