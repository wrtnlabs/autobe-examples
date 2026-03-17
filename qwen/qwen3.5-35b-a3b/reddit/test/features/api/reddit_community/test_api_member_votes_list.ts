import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityVote";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import type { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_votes_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Create member connection using the authorization token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: joinResponse.token.access,
  };
  // 3. Retrieve member's vote history with default pagination
  const votesResponse = await api.functional.redditCommunity.member.votes.index(
    memberConnection,
    {
      body: {
        commentId: null,
        postId: null,
        page: 1,
      } satisfies IRedditCommunityVote.IRequest,
    },
  );
  typia.assert(votesResponse);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    votesResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    votesResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    votesResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    votesResponse.pagination.pages >= 0,
  );
  // Validate pages calculation
  const expectedPages =
    votesResponse.pagination.records === 0
      ? 0
      : Math.ceil(
          votesResponse.pagination.records / votesResponse.pagination.limit,
        );
  TestValidator.equals(
    "pagination pages calculation",
    expectedPages,
    votesResponse.pagination.pages,
  );
  // 5. Validate vote records
  if (votesResponse.data.length > 0) {
    for (const vote of votesResponse.data) {
      typia.assert(vote);
      // Validate vote_type is upvote or downvote
      TestValidator.predicate(
        "vote_type is upvote or downvote",
        vote.vote_type === "upvote" || vote.vote_type === "downvote",
      );
      // Validate member has required fields
      TestValidator.predicate("member has id", vote.member.id !== undefined);
      TestValidator.predicate(
        "member has username",
        vote.member.username !== undefined,
      );
      TestValidator.predicate(
        "member has created_at",
        vote.member.created_at !== undefined,
      );
      // Validate timestamps are valid
      try {
        new Date(vote.created_at);
        new Date(vote.member.created_at);
      } catch {
        throw new Error("Invalid datetime format in vote or member");
      }
    }
  } else {
    // Empty case: should have empty data array
    TestValidator.predicate(
      "votes data is empty when no votes exist",
      votesResponse.data.length === 0,
    );
  }
}
