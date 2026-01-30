import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_comment_vote_removal_by_mod(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData: ICommunityBbsModerator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ICommunityBbsModerator.IJoin;
  await authorize_moderator_join(moderatorConnection, { body: moderatorData });
  // Step 2: Generate a random vote ID to delete (assumed to exist in system)
  // This is a placed ID - we have no way to create the vote - we assume it exists
  const voteId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Perform the deletion - must succeed with 204 No Content
  // No response body - returns void
  await api.functional.communityBbs.moderator.comment_votes.erase(
    moderatorConnection,
    {
      voteId,
    },
  );
}
