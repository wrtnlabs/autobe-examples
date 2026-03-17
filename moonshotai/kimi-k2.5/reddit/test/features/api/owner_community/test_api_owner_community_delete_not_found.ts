import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

/**
 * Test the error scenario when attempting to delete a community that does not
 * exist in the system. Tests the system's handling of invalid resource references.
 *
 * The test flow:
 * 1. Authenticate as an owner
 * 2. Generate a random UUID that doesn't correspond to any community
 * 3. Call the delete endpoint with that communityId
 *
 * Expected results:
 * - The system fails gracefully with a not-found error
 * - Error response informs the user that the community could not be found
 * - No changes occur in the database
 * - No orphaned operations or side effects are triggered
 *
 * This validates the requirement that when a user attempts to delete a community
 * that doesn't exist, the system SHALL handle this as a missing resource
 * scenario and inform the user accordingly.
 */
export async function test_api_owner_community_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as an owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  // 2. Generate a random UUID that doesn't exist
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete the non-existent community - should fail with error
  await TestValidator.error(
    "delete non-existent community should throw error",
    async () => {
      await api.functional.redditLike.owner.communities.erase(ownerConnection, {
        communityId: nonExistentCommunityId,
      });
    },
  );
}
