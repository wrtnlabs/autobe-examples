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

export async function test_api_voting_update_from_down_to_up(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {} satisfies ICommunityPlatformMember.IJoin,
  });
  // 2. Create a downvote on a comment
  const downVote = await generate_random_community_platform_member_votes_create(
    memberConnection,
    {
      body: {
        vote_type: "down",
        votable_type: "comment",
        votable_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  // 3. Update downvote to upvote
  const updatedVote =
    await api.functional.communityPlatform.member.votes.update(
      memberConnection,
      {
        voteId: downVote.id,
        body: { vote_type: "up" } satisfies ICommunityPlatformVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // 4. Validate business logic
  TestValidator.equals("Vote type should be 'up'", updatedVote.vote_type, "up");
}
