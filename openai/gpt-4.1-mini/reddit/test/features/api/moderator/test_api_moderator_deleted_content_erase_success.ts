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
 * Test the permanent deletion of a deleted content record by an authorized moderator.
 *
 * Steps:
 * - Authenticate as a moderator by registering a new moderator account.
 * - Assume a deleted content record exists (test setup responsibility).
 * - Call DELETE /communityPlatform/moderator/deleted-contents/{id} with a valid ID.
 * - Validate successful completion with no errors.
 *
 * Note: Verification of record removal and cascading cleanup is assumed to be handled
 * at the service or integration test level, as no API to verify these actions is provided.
 */
export async function test_api_moderator_deleted_content_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new moderator and get authorized connection
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<string & tags.Format<"email">>().split("@")[0],
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    },
  );
  // 2. Create a new connection for the authorized moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // 3. Assume the existence of a deleted content record with a valid UUID
  const deletedContentId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call DELETE /communityPlatform/moderator/deleted-contents/{id}
  await api.functional.communityPlatform.moderator.deleted_contents.eraseDeletedContent(
    moderatorConnection,
    { id: deletedContentId },
  );
}
