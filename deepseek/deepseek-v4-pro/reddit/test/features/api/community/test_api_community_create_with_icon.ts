import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";

/**
 * Test community creation with a custom icon image URI.
 *
 * Validates that an authenticated member can create a new community with a
 * unique name, description, and a specific icon_image URI. Confirms the full
 * community object is returned with the provided icon_image preserved, and all
 * standard fields are present: UUID id, name, description, subscriber_count
 * initialized to zero, owner identity matching the authenticated member, and
 * both created_at and updated_at timestamps.
 *
 * The test ensures the community creation flow correctly stores and returns the
 * icon_image URI without modification, the subscriber_count starts at zero
 * (owner is not auto-subscribed), and the owner relationship is correctly
 * established to the creating member.
 *
 * 1. Register and authenticate a new member via authorize_member_join.
 * 2. Create a community with a specific icon_image URI using the generate utility.
 * 3. Validate response: icon_image matches, subscriber_count is 0, owner matches,
 *    and all required fields are present.
 */
export async function test_api_community_create_with_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a community with a specific icon_image URI
  const iconUri = "https://example.com/icons/community.png";
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      { body: { icon_image: iconUri } },
    );
  typia.assert(community);
  // 3. Validate the response
  TestValidator.equals(
    "icon_image matches input",
    community.icon_image,
    iconUri,
  );
  TestValidator.equals(
    "subscriber_count initialized to zero",
    community.subscriber_count,
    0,
  );
  TestValidator.equals(
    "owner matches authenticated member",
    community.owner.id,
    member.id,
  );
  TestValidator.predicate("has id", community.id.length > 0);
  TestValidator.predicate("has name", community.name.length > 0);
  TestValidator.predicate("has created_at", community.created_at.length > 0);
  TestValidator.predicate("has updated_at", community.updated_at.length > 0);
}
