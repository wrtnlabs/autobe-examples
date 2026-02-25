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

export async function test_api_moderator_post_vote_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario covers unauthorized attempt to delete a post vote by a user who is not a moderator.
  // Steps:
  // 1) Attempt to call DELETE /communityPlatform/moderator/postVotes/moderators/{postVoteId} with a valid postVoteId UUID but without moderator authentication or using a user with insufficient roles.
  // 2) Verify the response status is 403 Forbidden or 401 Unauthorized depending on the system.
  // 3) Verify the post vote remains unchanged in the system. This tests authorization enforcement protecting the deletion operation.
  // Create a non-moderator (basic) connection with no authorization headers
  const userConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID as postVoteId
  const postVoteId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete post vote without moderator authorization
  await TestValidator.httpError(
    "unauthorized delete post vote",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.postVotes.moderators.erase(
        userConnection,
        {
          postVoteId,
        },
      );
    },
  );
}
