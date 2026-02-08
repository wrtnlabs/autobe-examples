import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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

export async function test_api_community_moderator_assignment_update_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Test authorization enforcement on updating community moderator assignments
  // Create unauthorized moderator (not owning nor admin)
  const unauthorizedModeratorConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedModeratorAuth = await authorize_moderator_join(
    { host: connection.host },
    { body: {} satisfies ICommunityPlatformModerator.IJoin },
  );
  unauthorizedModeratorConnection.headers = {
    Authorization: unauthorizedModeratorAuth.token.access,
  };
  // Use random UUID for communityModeratorId which likely does not exist
  const fakeCommunityModeratorId = typia.random<string & tags.Format<"uuid">>();
  // Define a dummy update body conforming to ICommunityPlatformCommunityModerator.IUpdate
  // Since we only have empty defs for this DTO, we send an empty object as body
  const updateBody = {} satisfies ICommunityPlatformCommunityModerator.IUpdate;
  // Expect error for unauthorized update attempt
  await TestValidator.httpError(
    "unauthorized moderator update should fail",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.communityModerators.update(
        unauthorizedModeratorConnection,
        {
          communityModeratorId: fakeCommunityModeratorId,
          body: updateBody,
        },
      );
    },
  );
  // Attempt update with invalid token
  const invalidTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalid.token" },
  };
  await TestValidator.httpError(
    "access with invalid token should be denied",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.communityModerators.update(
        invalidTokenConnection,
        {
          communityModeratorId: fakeCommunityModeratorId,
          body: updateBody,
        },
      );
    },
  );
  // Attempt update with expired token (simulate by a random expired token - we just reuse invalid token here)
  // Since we cannot generate an actual expired token here, simulate using invalid token behavior
  const expiredTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer expired.token" },
  };
  await TestValidator.httpError(
    "access with expired token should be denied",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.communityModerators.update(
        expiredTokenConnection,
        {
          communityModeratorId: fakeCommunityModeratorId,
          body: updateBody,
        },
      );
    },
  );
  // Auth as a valid moderator to create real communityModeratorId for testing unauthorized assignment update
  const validModeratorConnection: api.IConnection = { host: connection.host };
  const validModeratorAuth = await authorize_moderator_join(
    { host: connection.host },
    { body: {} satisfies ICommunityPlatformModerator.IJoin },
  );
  validModeratorConnection.headers = {
    Authorization: validModeratorAuth.token.access,
  };
  // Create a community moderator assignment update with valid id
  // Since no creation API is mentioned, we use a fake UUID and expect not found or error for update
  await TestValidator.httpError(
    "update non-existent communityModeratorId should return error",
    [404, 403, 400], // Depending on implementation, can be 404 or 403 or 400
    async () => {
      await api.functional.communityPlatform.moderator.communityModerators.update(
        validModeratorConnection,
        {
          communityModeratorId: fakeCommunityModeratorId,
          body: updateBody,
        },
      );
    },
  );
}
