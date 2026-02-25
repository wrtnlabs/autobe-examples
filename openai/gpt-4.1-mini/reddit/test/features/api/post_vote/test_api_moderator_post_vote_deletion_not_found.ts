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

export async function test_api_moderator_post_vote_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: `mod_${RandomGenerator.alphabets(6)}`,
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  moderatorConnection.headers = { Authorization: moderator.token.access };
  // 2. Generate a random UUID for a non-existing post vote ID
  const nonExistingPostVoteId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete the non-existing post vote
  await TestValidator.httpError(
    "delete non-existing post vote returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.postVotes.moderators.erase(
        moderatorConnection,
        {
          postVoteId: nonExistingPostVoteId,
        },
      );
    },
  );
}
