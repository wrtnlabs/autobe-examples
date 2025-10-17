import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMember";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test pagination functionality for community subscriber lists.
 *
 * This test validates that the subscriber list pagination works correctly for
 * communities with multiple subscribers. It creates a public community,
 * registers multiple members who subscribe to it, then retrieves the subscriber
 * list with pagination parameters to verify correct pagination behavior.
 *
 * Test flow:
 *
 * 1. Create and authenticate the community creator
 * 2. Create a public community for testing
 * 3. Create 15 additional member accounts
 * 4. Have all members subscribe to the community
 * 5. Retrieve subscriber list and validate pagination metadata
 * 6. Verify total count matches actual subscriber count
 * 7. Validate page size limits are respected
 */
export async function test_api_community_subscriber_list_pagination(
  connection: api.IConnection,
) {
  const creatorMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(creatorMember);

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  const subscriberCount = 15;
  const subscribers = await ArrayUtil.asyncRepeat(
    subscriberCount,
    async (index) => {
      const member = await api.functional.auth.member.join(connection, {
        body: {
          username: `${RandomGenerator.name(1)}_${index}`,
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(10),
        } satisfies IRedditLikeMember.ICreate,
      });
      typia.assert(member);

      const subscription =
        await api.functional.redditLike.member.communities.subscribe.create(
          connection,
          {
            communityId: community.id,
          },
        );
      typia.assert(subscription);

      return member;
    },
  );

  const subscriberList =
    await api.functional.redditLike.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscriberList);

  TestValidator.equals(
    "total subscriber count matches",
    subscriberList.pagination.records,
    subscriberCount,
  );

  TestValidator.predicate(
    "pagination has valid current page",
    subscriberList.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination has valid limit",
    subscriberList.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination pages calculated correctly",
    subscriberList.pagination.pages ===
      Math.ceil(
        subscriberList.pagination.records / subscriberList.pagination.limit,
      ),
  );

  TestValidator.predicate(
    "data array length does not exceed limit",
    subscriberList.data.length <= subscriberList.pagination.limit,
  );

  TestValidator.predicate(
    "subscriber list contains member data",
    subscriberList.data.length > 0,
  );

  const subscriberIds = subscribers.map((s) => s.id);
  const returnedIds = subscriberList.data.map((d) => d.id);

  TestValidator.predicate(
    "all returned subscriber IDs are from created members",
    returnedIds.every((id) => subscriberIds.includes(id)),
  );
}
