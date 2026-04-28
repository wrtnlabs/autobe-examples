import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";

/**
 * Test retrieving a community's full public details by its UUID without authentication.
 *
 * Validates that unauthenticated users can retrieve complete community details for discovery and browsing. The test creates a member account, creates a community with name, description, and optional icon_uri, then retrieves the community details through the public endpoint.
 *
 * Special attention is given to verifying that all fields are present including the creator member summary, and that the creator information matches the authenticated member who created the community. Validates that deleted_at is null for active communities and that timestamps are valid ISO 8601 datetime strings.
 *
 * 1. Register and authenticate a new member account with email, password, and username.
 * 2. Create a community with unique name, descriptive text, and optional icon URI.
 * 3. Retrieve the community details using an unauthenticated connection.
 * 4. Validate all fields present: id, creator, name, description, icon_uri, created_at, updated_at, deleted_at.
 * 5. Verify creator object matches the authenticated member's summary data.
 */
export async function test_api_community_retrieve_public_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create a community using the authenticated member
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Retrieve community details using an unauthenticated connection
  const publicConnection: api.IConnection = { host: connection.host };
  const retrieved = await api.functional.redditLikeCommunity.communities.at(
    publicConnection,
    { communityId: community.id },
  );
  typia.assert(retrieved);
  // 4. Validate field integrity
  TestValidator.equals("community id matches", retrieved.id, community.id);
  TestValidator.equals(
    "community name matches",
    retrieved.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    retrieved.description,
    community.description,
  );
  TestValidator.equals(
    "community icon_uri matches",
    retrieved.icon_uri,
    community.icon_uri,
  );
  // 5. Validate creator information matches the authenticated member
  TestValidator.equals(
    "creator id matches member id",
    retrieved.creator.id,
    member.id,
  );
  TestValidator.equals(
    "creator username matches member username",
    retrieved.creator.username,
    member.username,
  );
  TestValidator.equals(
    "creator email matches member email",
    retrieved.creator.email,
    member.email,
  );
  // 6. Validate active community (not deleted)
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
}
