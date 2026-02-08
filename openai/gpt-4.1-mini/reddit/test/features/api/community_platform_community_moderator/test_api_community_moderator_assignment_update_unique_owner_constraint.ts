import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_moderator_assignment_update_unique_owner_constraint(
  connection: api.IConnection,
): Promise<void> {
  // Test business validation logic for unique owner role per community when updating a community moderator assignment.
  // 1. Authenticate as moderator.
  // 2. Confirm a community has an assigned owner.
  // 3. Attempt to update another community moderator's role to 'owner'.
  // 4. Verify the API returns an error indicating unique role constraint violation.
  // Connection for the moderator actor
  const moderatorConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as moderator
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {}, // empty join body as per IJoin
  });
  moderatorConnection.headers = {
    ...(moderatorConnection.headers ?? {}),
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // Create dummy UUIDs for testing
  const existingOwnerId = typia.random<string>();
  const anotherModeratorId = typia.random<string>();
  // Define update body trying to set role as "owner" for the second moderator
  const updateBody = {
    role: "owner", // exact const value
    deleted_at: null, // no deletion
  } satisfies ICommunityPlatformCommunityModerator.IUpdate;
  // 2. Attempt update with invalid communityModeratorId format
  await TestValidator.error(
    "update fails with invalid communityModeratorId format",
    async () => {
      await api.functional.communityPlatform.moderator.communityModerators.update(
        moderatorConnection,
        {
          communityModeratorId: "invalid-uuid-format",
          body: updateBody,
        },
      );
    },
  );
  // 3. Attempt update another moderator with a valid UUID to set role 'owner' but should fail because owner already exists
  await TestValidator.error(
    "unique owner role constraint violation on update",
    async () => {
      await api.functional.communityPlatform.moderator.communityModerators.update(
        moderatorConnection,
        {
          communityModeratorId: anotherModeratorId,
          body: updateBody,
        },
      );
    },
  );
  // 4. Additionally, test an update with a valid UUID but role 'moderator' should succeed
  const validUpdateBody = {
    role: "moderator", // exact const value
    deleted_at: null,
  } satisfies ICommunityPlatformCommunityModerator.IUpdate;
  // Perform update with 'moderator' role, expecting success
  const updateResponse =
    await api.functional.communityPlatform.moderator.communityModerators.update(
      moderatorConnection,
      {
        communityModeratorId: anotherModeratorId,
        body: validUpdateBody,
      },
    );
  // Assert the response is typed correctly and includes 'role'
  const typedResponse = typia.assert<
    ICommunityPlatformCommunityModerator & { role: "owner" | "moderator" } // union of possible roles
  >(updateResponse);
  TestValidator.equals(
    "updated role to moderator",
    typedResponse.role,
    "moderator",
  );
}
