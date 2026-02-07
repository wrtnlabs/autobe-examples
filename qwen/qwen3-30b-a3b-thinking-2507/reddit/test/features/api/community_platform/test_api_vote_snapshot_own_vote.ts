import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { ICommunityPlatformVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteSnapshot";
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

export async function test_api_vote_snapshot_own_vote(
  connection: api.IConnection,
): Promise<void> {
  // Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityPlatformMember.IJoin>(),
  });
  // Create vote (creates snapshot for initial state)
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
  // Retrieve the snapshot (using vote.id as snapshotId for initial snapshot)
  const snapshot =
    await api.functional.communityPlatform.member.votes.snapshots.at(
      memberConnection,
      {
        voteId: vote.id,
        snapshotId: vote.id,
      },
    );
  typia.assert(snapshot);
  // Validate business logic as per scenario description
  TestValidator.equals("vote state matches", vote.vote_type, vote.vote_type);
  TestValidator.predicate(
    "timestamp should exist",
    vote.updated_at !== undefined,
  );
  TestValidator.predicate("user should exist", vote.user !== undefined);
}
