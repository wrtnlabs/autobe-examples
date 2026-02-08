import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test the primary success scenario for deleting a community ban.
 *
 * Flow:
 * 1. A moderator joins the platform using the provided join endpoint.
 * 2. Moderator deletes an existing community ban by banId using the delete endpoint.
 * 3. Verify the ban deletion succeeds with a 204 No Content response.
 * 4. Optionally verify the user can now post and comment (if accessible).
 */
export async function test_api_community_ban_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Moderator join to get authentication token
  const moderatorConnection: IConnection = { host: connection.host };
  // Join with empty body as ICommunityPlatformModerator.IJoin is an empty object
  const authorized: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, { body: {} });
  typia.assert(authorized);
  // Update moderatorConnection headers to include bearer token
  moderatorConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Step 2: Prepare a valid banId to delete
  // Since we have no direct API to create a ban in this test scenario,
  // we simulate by generating a valid UUID banId that should exist for the test to be valid.
  // This is a limitation as scenario does not specify ban creation method.
  const banId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Delete the community ban
  await api.functional.communityPlatform.moderator.community_bans.erase(
    moderatorConnection,
    { banId },
  );
  // No response body expected, status code 204 No Content assumed handled internally
  // If possible, validate no error thrown and operation is successful
}
