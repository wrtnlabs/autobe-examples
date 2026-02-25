import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPostVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteOfModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_post_votes_moderators_retrieval_with_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registration and authorization
  const modJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: null,
  } satisfies ICommunityPlatformModerator.IJoin;
  const moderatorAuthorized = await authorize_moderator_join(
    { host: connection.host },
    { body: modJoinBody },
  );
  // Create a new connection with moderator's token
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuthorized.token.access}`,
  };
  // 2. To test pagination and filtering, simulate or fetch moderator post votes
  // We'll call index endpoint multiple times with different filters and pages
  // Test 1: Retrieve without filters, get first page
  const emptyFilterRequest: ICommunityPlatformPostVoteOfModerator.IRequest = {
    page: 1,
    limit: 5,
  };
  const page1 =
    await api.functional.communityPlatform.moderator.postVotes.moderators.index(
      moderatorConnection,
      { body: emptyFilterRequest },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "page1.data length <= limit",
    page1.data.length <= emptyFilterRequest.limit!,
  );
  TestValidator.predicate(
    "pagination current page equals 1",
    page1.pagination.current === 1,
  );
  if (page1.pagination.pages > 1) {
    // If multiple pages, test fetching page 2
    const page2 =
      await api.functional.communityPlatform.moderator.postVotes.moderators.index(
        moderatorConnection,
        { body: { page: 2, limit: 5 } },
      );
    typia.assert(page2);
    TestValidator.predicate(
      "page2.pagination current page equals 2",
      page2.pagination.current === 2,
    );
    // Test that data in page2 is different from page1 if possible
    if (page2.data.length > 0 && page1.data.length > 0) {
      TestValidator.notEquals(
        "page2 first data id differs from page1",
        page1.data[0].id,
        page2.data[0].id,
      );
    }
  }
  // 3. Test filtering by moderatorId: use an id from page1 (if exists)
  const firstVote = page1.data[0];
  if (firstVote !== undefined) {
    const filterByModeratorRequest: ICommunityPlatformPostVoteOfModerator.IRequest =
      {
        moderatorId: firstVote.communityPlatformModeratorId,
        page: 1,
        limit: 10,
      };
    const filteredByModerator =
      await api.functional.communityPlatform.moderator.postVotes.moderators.index(
        moderatorConnection,
        { body: filterByModeratorRequest },
      );
    typia.assert(filteredByModerator);
    TestValidator.predicate(
      "all votes belong to filtered moderator",
      filteredByModerator.data.every(
        (v) =>
          v.communityPlatformModeratorId ===
          filterByModeratorRequest.moderatorId,
      ),
    );
  }
  // 4. Test filtering by voteType: filter for 'upvote'
  const filterUpvoteRequest: ICommunityPlatformPostVoteOfModerator.IRequest = {
    voteType: "upvote",
    page: 1,
    limit: 10,
  };
  const filteredByUpvote =
    await api.functional.communityPlatform.moderator.postVotes.moderators.index(
      moderatorConnection,
      { body: filterUpvoteRequest },
    );
  typia.assert(filteredByUpvote);
  TestValidator.predicate(
    "all votes are upvote",
    filteredByUpvote.data.every((v) => v.voteType === "upvote"),
  );
  // 5. Test filtering by moderatorId and voteType combined
  if (firstVote !== undefined) {
    const filterCombinedRequest: ICommunityPlatformPostVoteOfModerator.IRequest =
      {
        moderatorId: firstVote.communityPlatformModeratorId,
        voteType: firstVote.voteType,
        page: 1,
        limit: 10,
      };
    const filteredCombined =
      await api.functional.communityPlatform.moderator.postVotes.moderators.index(
        moderatorConnection,
        { body: filterCombinedRequest },
      );
    typia.assert(filteredCombined);
    TestValidator.predicate(
      "all votes belong to filtered moderator (combined)",
      filteredCombined.data.every(
        (v) =>
          v.communityPlatformModeratorId === filterCombinedRequest.moderatorId,
      ),
    );
    TestValidator.predicate(
      "all votes have specified voteType (combined)",
      filteredCombined.data.every(
        (v) => v.voteType === filterCombinedRequest.voteType,
      ),
    );
  }
}
