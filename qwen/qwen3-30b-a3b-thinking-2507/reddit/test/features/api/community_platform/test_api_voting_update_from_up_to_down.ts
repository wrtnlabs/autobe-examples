import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_votes_create } from "../../../generate/generate_random_community_platform_member_votes_create";
import { prepare_random_community_platform_vote } from "../../../prepare/prepare_random_community_platform_vote";

export async function test_api_voting_update_from_up_to_down(
  connection: api.IConnection,
) {
  // 1. Auth as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create an upvote on a post
  const vote = await generate_random_community_platform_member_votes_create(
    memberConnection,
    {
      body: {
        vote_type: "up",
        votable_type: "post",
        votable_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(vote);
  // 3. Update the vote from up to down
  const updatedVote =
    await api.functional.communityPlatform.member.votes.update(
      memberConnection,
      {
        voteId: vote.id,
        body: {
          vote_type: "down",
        } satisfies ICommunityPlatformVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // 4. Verify the vote was updated
  TestValidator.equals(
    "vote type should be updated to down",
    updatedVote.vote_type,
    "down",
  );
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(updatedVote.updated_at).getTime() >
      new Date(vote.created_at).getTime(),
  );
}
