import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_hub_vote } from "../prepare/prepare_random_community_hub_vote";

/**
 * Generate a random vote on a post or comment via the API for E2E testing.
 *
 * Prepares random vote data using the prepare function, then calls the community
 * hub member votes creation endpoint. The returned vote record includes the vote
 * identifier, target reference, vote value, and timestamps.
 *
 * The vote direction is randomly selected between 1 (upvote) and -1 (downvote),
 * and the target type is randomly selected between post and comment. All properties
 * can be overridden via the optional body parameter.
 *
 * Authentication is handled automatically through the connection's session context.
 * The voting member's identity is derived from the authenticated session and is
 * not included in the request payload.
 */
export async function generate_random_community_hub_member_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityHubVote.ICreate> | undefined;
  },
): Promise<ICommunityHubVote> {
  const prepared: ICommunityHubVote.ICreate = prepare_random_community_hub_vote(
    props.body,
  );
  return await api.functional.communityHub.member.votes.create(connection, {
    body: prepared,
  });
}
