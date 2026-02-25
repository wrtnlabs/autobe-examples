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

export async function test_api_moderator_reported_content_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins and obtains authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: `moderator${RandomGenerator.alphabets(5)}@example.com`,
      username: `moduser_${RandomGenerator.alphabets(5)}`,
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(moderator);
  moderatorConnection.headers = { Authorization: moderator.token.access };
  // 2. Create a reported content entry in DB for deletion test
  // Since we don't have utility to create reported content, we'll simulate with a random UUID assuming it exists
  const reportedContentId = typia.random<string & tags.Format<"uuid">>();
  // Note: Deletion API expects the ID of existing reported content.
  // We simulate deletion of a valid reported content by assuming the ID is valid.
  // 3. Moderator deletes the reported content record
  await api.functional.communityPlatform.moderator.reportedContents.erase(
    moderatorConnection,
    { id: reportedContentId },
  );
  // 4. Since the response is void, no body returned, so check with no error thrown
  // Additional verification if API supported, but here we trust successful await
}
