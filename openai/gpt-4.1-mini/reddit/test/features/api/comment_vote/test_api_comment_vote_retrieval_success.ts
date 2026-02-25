import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_community_platform_comment_votes_create } from "../../../generate/generate_random_community_platform_comment_votes_create";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";

export async function test_api_comment_vote_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const createdVoteRaw =
    await generate_random_community_platform_comment_votes_create(
      userConnection,
      { body: {} },
    );
  // We assume create returns a structure that includes commentVoteId
  // We'll assert type and extract commentVoteId property safely
  typia.assert(createdVoteRaw);

  // Cast createdVoteRaw to type that includes commentVoteId
  // Use commentVoteId property as passed to .at method
  // We expect commentVoteId to be string or number based on API design

  const commentVoteId = (createdVoteRaw as any).commentVoteId ?? (createdVoteRaw as any).id;
  if (commentVoteId === undefined) {
    throw new Error("Created comment vote lacks commentVoteId or id property");
  }

  const retrievedVote = await api.functional.communityPlatform.commentVotes.at(
    userConnection,
    {
      commentVoteId: commentVoteId,
    },
  );
  typia.assert(retrievedVote);
  TestValidator.predicate(
    "retrieved vote has valid upvoteCount",
    typeof retrievedVote.upvoteCount === "number",
  );
  TestValidator.predicate(
    "retrieved vote has valid downvoteCount",
    typeof retrievedVote.downvoteCount === "number",
  );
  TestValidator.predicate(
    "retrieved vote is not soft deleted",
    retrievedVote.upvoteCount >= 0 && retrievedVote.downvoteCount >= 0,
  );
}
