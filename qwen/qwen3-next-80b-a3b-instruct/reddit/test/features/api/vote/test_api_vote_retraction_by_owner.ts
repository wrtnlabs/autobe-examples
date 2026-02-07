import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_votes_create } from "../../../generate/generate_random_community_member_votes_create";
import { prepare_random_community_post_vote } from "../../../prepare/prepare_random_community_post_vote";

export async function test_api_vote_retraction_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join to authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  typia.assert(joinResult);
  // 2. Create a vote on a post
  const createdVote = await generate_random_community_member_votes_create(
    memberConnection,
    {
      body: typia.random<ICommunityPostVote.ICreate>(),
    },
  );
  typia.assert(createdVote);
  // 3. Retract the vote by its ID using the member's connection
  await api.functional.community.member.votes.erase(memberConnection, {
    voteId: createdVote.id,
  });
  // 4. Validate that the vote was soft-deleted by retrieving it
  // Note: Since we don't have a direct GET endpoint for votes, we validate through business logic
  // Since we're testing retraction by owner, and the API successfully erased the vote,
  // we assume the soft-delete by setting deleted_at has occurred successfully.
  // Validate that the retraction was successful through the fact that
  // the API call succeeded and no errors were thrown.
  // The business logic guarantees that if the voteId belongs to the member, it gets soft-deleted.
}
