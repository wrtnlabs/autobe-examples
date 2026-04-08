import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member subscribed communities retrieval with proper authentication and pagination.
 *
 * Validates the complete flow of retrieving subscribed communities for an authenticated member,
 * including session establishment, API call with proper authentication, and response validation.
 * Ensures that the response correctly follows the paginated structure with proper community
 * details and subscription metadata.
 *
 * Special attention is given to verifying that pagination metadata is accurate, community
 * details are properly joined, and all timestamps are correctly formatted.
 *
 * 1. Create authenticated member session with random credentials.
 * 2. Call subscribed communities endpoint with default pagination parameters.
 * 3. Validate response structure and pagination metadata accuracy.
 * 4. Verify community details contain all required fields from ISummary type.
 * 5. Ensure subscription records have proper timestamp formats.
 */
export async function test_api_member_subscribed_communities_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username:
          RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(4),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);

  // 2. Call subscribed communities endpoint
  const result: IPageIRedditPlatformSubscription.ISummary =
    await api.functional.redditPlatform.member.users.subscribed_communities.index(
      memberConnection,
      {
        userId: member.id,
        body: typia.random<IRedditPlatformSubscription.IRequest>(),
      },
    );
  typia.assert(result);

  // 3. Validate pagination metadata
  const { pagination } = result;
  TestValidator.predicate(
    "pagination current is positive integer",
    Number.isInteger(pagination.current) && pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive integer",
    Number.isInteger(pagination.limit) && pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative integer",
    Number.isInteger(pagination.records) && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative integer",
    Number.isInteger(pagination.pages) && pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records matches data array length",
    pagination.records === result.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    pagination.pages ===
      (pagination.records === 0 ? 0 : Math.ceil(pagination.records / pagination.limit)),
  );

  // 4. Validate each subscription record in the data array
  await ArrayUtil.asyncForEach(result.data, async (subscription) => {
    typia.assert(subscription);

    // Validate community details
    const { community } = subscription;
    typia.assert(community);

    TestValidator.predicate("community id is valid UUID", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(community.id),
    );
    TestValidator.predicate("community name is non-empty string", () =>
      typeof community.name === "string" && community.name.length > 0,
    );
    TestValidator.predicate(
      "community subscriber count is non-negative integer",
      () => Number.isInteger(community.subscriber_count) && community.subscriber_count >= 0,
    );

    // Validate owner (IRedditPlatformMember.ISummary)
    const { owner } = community;
    typia.assert(owner);
    TestValidator.predicate("owner id is valid UUID", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner.id),
    );
    TestValidator.predicate("owner username is non-empty string", () =>
      typeof owner.username === "string" && owner.username.length > 0,
    );
    TestValidator.predicate("owner karma is integer", () =>
      Number.isInteger(owner.karma) && owner.karma >= 0,
    );

    // Validate community created_at timestamp
    TestValidator.predicate("community created_at is valid ISO datetime", () =>
      !isNaN(Date.parse(community.created_at)),
    );

    // Validate community updated_at timestamp
    TestValidator.predicate("community updated_at is valid ISO datetime", () =>
      !isNaN(Date.parse(community.updated_at)),
    );

    // Validate subscription created_at timestamp
    TestValidator.predicate("subscription created_at is valid ISO datetime", () =>
      !isNaN(Date.parse(subscription.created_at)),
    );

    // Validate subscription deleted_at (can be null or valid ISO datetime)
    if (subscription.deleted_at !== null && subscription.deleted_at !== undefined) {
      TestValidator.predicate("subscription deleted_at is valid ISO datetime", () =>
        !isNaN(Date.parse(subscription.deleted_at!)),
      );
    }

    // Validate subscription subscribed_at (can be null or valid ISO datetime)
    if (
      subscription.subscribed_at !== null &&
      subscription.subscribed_at !== undefined
    ) {
      TestValidator.predicate("subscription subscribed_at is valid ISO datetime", () =>
        !isNaN(Date.parse(subscription.subscribed_at!)),
      );
    }

    // Validate community optional fields
    if (community.description !== null && community.description !== undefined) {
      TestValidator.predicate("community description is non-empty string", () =>
        typeof community.description === "string" && community.description.length > 0,
      );
    }

    if (community.icon_url !== null && community.icon_url !== undefined) {
      TestValidator.predicate("community icon_url is valid URI", () =>
        /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[a-zA-Z0-9\.\-]+$/.test(community.icon_url!),
      );
    }
  });
}