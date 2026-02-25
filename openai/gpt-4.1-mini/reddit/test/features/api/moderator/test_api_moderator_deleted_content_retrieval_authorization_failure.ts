import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_deleted_content_retrieval_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // This test checks that fetching a deleted content by id without moderator authentication
  // results in 401 Unauthorized or 403 Forbidden error with proper error message.
  // Step 1: Moderator join and authenticate to get a valid deleted content id
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinedModerator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: `mod_${RandomGenerator.alphabets(5)}@test.com`,
      username: `moduser_${RandomGenerator.alphabets(5)}`,
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(joinedModerator);
  // We use the moderatorConnection authenticated with token
  moderatorConnection.headers = {
    ...(moderatorConnection.headers ?? {}),
    Authorization: joinedModerator.token.access,
  };
  // Step 2: Use authenticated moderator connection to create a deleted content record...
  // However, no creation endpoint for deleted contents provided,
  // so test requires existing deleted content id.
  // To handle this, we attempt to fetch a random valid UUID from the system,
  // assuming there is a deleted content with that UUID.
  // Generate random but valid UUID string to test authorization denial
  const randomDeletedContentId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create an unauthenticated connection (no headers) to test authorization failure
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Step 4: Attempt to fetch deleted content without authentication
  await TestValidator.httpError(
    "unauthorized access to deleted content",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.deleted_contents.atDeletedContent(
        unauthenticatedConnection,
        { id: randomDeletedContentId },
      );
    },
  );
}
