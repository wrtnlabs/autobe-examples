import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModeratorHistory";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorHistory";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

export async function test_api_moderator_history_view_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. First moderator - create account and authenticate
  const firstModeratorConnection: api.IConnection = { host: connection.host };
  const firstModerator = await authorize_member_join(firstModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string>() as string & tags.Format<"uri">,
    },
  });
  typia.assert(firstModerator);
  firstModeratorConnection.headers = {
    ...firstModeratorConnection.headers,
    Authorization: `Bearer ${firstModerator.token.access}`,
  };
  // 2. Create community as first moderator
  const community =
    await generate_random_reddit_platform_member_communities_create(
      firstModeratorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Second moderator - create account and authenticate
  const secondModeratorConnection: api.IConnection = { host: connection.host };
  const secondModerator = await authorize_member_join(
    secondModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string>() as string & tags.Format<"uri">,
      },
    },
  );
  typia.assert(secondModerator);
  secondModeratorConnection.headers = {
    ...secondModeratorConnection.headers,
    Authorization: `Bearer ${secondModerator.token.access}`,
  };
  // 4. Add second member as moderator (creates APPOINTED history)
  const secondModeratorAppointment =
    await generate_random_reddit_platform_member_communities_moderators_create(
      firstModeratorConnection,
      {
        body: {
          user_id: secondModerator.user.id,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(secondModeratorAppointment);
  // 5. Third moderator - create account and authenticate
  const thirdModeratorConnection: api.IConnection = { host: connection.host };
  const thirdModerator = await authorize_member_join(thirdModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string>() as string & tags.Format<"uri">,
    },
  });
  typia.assert(thirdModerator);
  thirdModeratorConnection.headers = {
    ...thirdModeratorConnection.headers,
    Authorization: `Bearer ${thirdModerator.token.access}`,
  };
  // 6. Add third member as moderator (creates second APPOINTED history)
  const thirdModeratorAppointment =
    await generate_random_reddit_platform_member_communities_moderators_create(
      firstModeratorConnection,
      {
        body: {
          user_id: thirdModerator.user.id,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(thirdModeratorAppointment);
  // 7. Remove second member as moderator (creates REMOVED history)
  await api.functional.redditPlatform.member.communities.moderators.eraseByCommunityidAndModeratorid(
    firstModeratorConnection,
    {
      communityId: community.id,
      moderatorId: secondModerator.user.id,
    },
  );
  // 8. First moderator requests moderator history without filters
  const historyResponse =
    await api.functional.redditPlatform.member.communities.moderator_histories.index(
      firstModeratorConnection,
      {
        communityId: community.id,
        body: {},
      },
    );
  typia.assert(historyResponse);
  // 9. Verify response contains 3 records
  TestValidator.equals("history count", historyResponse.data.length, 3);
  // 10. Verify records are in descending order by created_at
  TestValidator.predicate("records sorted by created_at descending", () => {
    for (let i = 0; i < historyResponse.data.length - 1; i++) {
      if (
        new Date(historyResponse.data[i].created_at) <
        new Date(historyResponse.data[i + 1].created_at)
      ) {
        return false;
      }
    }
    return true;
  });
  // 11. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    historyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    historyResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records count",
    historyResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages count",
    historyResponse.pagination.pages,
    1,
  );
  // 12. Verify each record has complete community and user details
  for (const record of historyResponse.data) {
    TestValidator.predicate(
      "record has community data",
      () =>
        record.community !== null &&
        record.community !== undefined &&
        record.community.name.length > 0,
    );
    TestValidator.predicate(
      "record has user data",
      () =>
        record.user !== null &&
        record.user !== undefined &&
        record.user.username.length > 0 &&
        record.user.karma_score !== undefined,
    );
  }
  // 13. Non-moderator attempts to access endpoint
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string>() as string & tags.Format<"uri">,
    },
  });
  nonModeratorConnection.headers = {
    ...nonModeratorConnection.headers,
    Authorization: `Bearer ${nonModeratorConnection.headers?.Authorization}`, // Note: token is in response
  };
  // 14. Verify authorization rejection
  await TestValidator.httpError(
    "non-moderator access denied",
    [401, 403],
    async () => {
      await api.functional.redditPlatform.member.communities.moderator_histories.index(
        nonModeratorConnection,
        {
          communityId: community.id,
          body: {},
        },
      );
    },
  );
}