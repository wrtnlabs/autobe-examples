import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

/**
 * Test community creation with all optional fields provided.
 *
 * Validates that an authenticated member can successfully create a new community with a unique name, optional description, and optional icon URL. The test ensures the system correctly creates the community record, assigns ownership to the authenticated member, initializes subscriber count to zero, and returns complete community entity with all metadata.
 *
 * Special attention is given to verifying that the owner information is correctly set to the creating member, the subscriber count starts at zero, and all auto-generated fields (id, timestamps) are properly populated with valid values.
 *
 * 1. Create member connection and authenticate via authorize_member_join with unique credentials.
 * 2. Prepare community creation data with unique name, description, and icon URL.
 * 3. Call community creation endpoint via generate_random_reddit_like_member_communities_create.
 * 4. Validate response structure with typia.assert to ensure type safety.
 * 5. Verify subscriber count is 0 initially before any subscriptions.
 * 6. Verify owner information matches the authenticated member's summary.
 * 7. Verify timestamps (created_at, updated_at) are present and valid ISO 8601 format.
 * 8. Verify community name is unique and matches the input value.
 */
export async function test_api_community_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16) satisfies string &
          tags.MinLength<8>,
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Prepare community creation data with all optional fields
  const communityName: string = `community_${RandomGenerator.alphabets(8)}`;
  const description: string = RandomGenerator.paragraph({ sentences: 5 });
  const iconUrl: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  // 3. Create community with all fields
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: description,
          icon_url: iconUrl,
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Verify subscriber count is 0 initially
  TestValidator.equals(
    "initial subscriber count",
    community.subscriber_count,
    0,
  );
  // 5. Verify owner information
  TestValidator.equals(
    "owner ID matches member",
    community.owner.id,
    member.id,
  );
  TestValidator.equals(
    "owner username matches",
    community.owner.username,
    member.username,
  );
  // 6. Verify timestamps are present and valid
  TestValidator.predicate(
    "created_at is valid ISO format",
    /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/.test(community.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO format",
    /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/.test(community.updated_at),
  );
  // 7. Verify community name matches input
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityName,
  );
  // 8. Verify description and icon_url are set correctly
  TestValidator.equals(
    "description matches input",
    community.description,
    description,
  );
  TestValidator.equals("icon_url matches input", community.icon_url, iconUrl);
}
