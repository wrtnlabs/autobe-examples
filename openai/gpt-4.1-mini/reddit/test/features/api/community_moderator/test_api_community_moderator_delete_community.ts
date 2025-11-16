import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test deletion of a community by a communityModerator user.
 *
 * This function tests that a communityModerator can authenticate using the join
 * API and then delete a community identified by its unique name. It assumes the
 * community to be deleted already exists outside this test context.
 *
 * The test validates that the delete call completes successfully, indicating
 * the community is removed and that only authorized communityModerators can
 * perform this action.
 *
 * Note: Due to the lack of a direct community read or list API in the provided
 * SDK functions, permanent deletion verification is limited to no errors on
 * deletion call.
 *
 * @param connection Connection object for API calls
 */
export async function test_api_community_moderator_delete_community(
  connection: api.IConnection,
) {
  // 1. Authenticate as a communityModerator user by creating a new account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "1234";
  const moderatorNickname = RandomGenerator.name();

  const authorizedModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(authorizedModerator);

  // 2. Assume the community to be deleted exists externally and we have its unique name
  // For test use a random community name string
  const communityNameToDelete = RandomGenerator.alphaNumeric(12);

  // 3. Perform the delete operation on the specified community name
  await api.functional.redditCommunity.communityModerator.communities.erase(
    connection,
    {
      communityName: communityNameToDelete,
    },
  );

  // 4. Verify permanent removal: successful completion implies the deletion was accepted
}
