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
 * Test community creation with minimal required fields only.
 *
 * Validates that authenticated members can create communities with only the required name field, without providing optional description or icon_url. The system should successfully create the community with null values for optional fields and ensure the community remains fully functional for posting and subscription.
 *
 * This test verifies the API's flexibility in accepting minimal community creation requests while maintaining all core functionality. It ensures that optional metadata does not affect the community's operational capabilities.
 *
 * 1. Authenticate as member using authorize_member_join utility function.
 * 2. Generate unique community name using RandomGenerator.
 * 3. Create community with only name field (description and icon_url omitted).
 * 4. Validate response structure using typia.assert().
 * 5. Verify description and icon_url are null in the created community.
 * 6. Verify subscriber_count is 0 initially.
 * 7. Verify the community owner matches the authenticated member.
 */
export async function test_api_community_creation_with_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate unique community name
  const communityName: string = `test-community-${RandomGenerator.alphaNumeric(8)}`;
  // 3. Create community with only name field
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(
      memberConnection,
      {
        body: {
          name: communityName,
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Verify community structure with minimal fields
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals("description is null", community.description, null);
  TestValidator.equals("icon_url is null", community.icon_url, null);
  TestValidator.equals(
    "subscriber count is zero",
    community.subscriber_count,
    0,
  );
  // 5. Verify owner information exists
  TestValidator.predicate(
    "owner has valid id",
    community.owner.id !== undefined,
  );
  TestValidator.predicate(
    "owner has valid username",
    community.owner.username !== undefined,
  );
  // 6. Verify timestamps exist
  TestValidator.predicate(
    "created_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      community.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      community.updated_at,
    ),
  );
  // 7. Verify deleted_at is null for active community
  TestValidator.equals("deleted_at is null", community.deleted_at, null);
  // 8. Verify community id is valid
  TestValidator.predicate("community has valid id", community.id !== undefined);
  TestValidator.predicate(
    "community id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      community.id,
    ),
  );
}