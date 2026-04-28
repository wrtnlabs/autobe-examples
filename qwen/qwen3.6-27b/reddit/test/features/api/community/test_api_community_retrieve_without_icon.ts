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
 * Test community retrieval when the community was created without an icon image.
 *
 * Validates that communities can be successfully created without an icon_uri and that the community retrieval endpoint properly returns null for the icon_uri field. The test also verifies that all other community fields are correctly populated and that the creator reference points to the registered member.
 *
 * This test ensures proper handling of the nullable icon_uri field, confirming that the API correctly distinguishes between omitted and null values, and maintains data integrity for optional fields.
 *
 * 1. Register and authenticate a new member on the platform.
 * 2. Create a community with name and description but explicitly null icon_uri.
 * 3. Retrieve the community by its unique identifier.
 * 4. Validate the response schema and verify icon_uri is null, other fields match, ...
 */
export async function test_api_community_retrieve_without_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create a community with name and description, but no icon_uri
  const communityBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    icon_uri: null,
  } satisfies IREdditLikeCommunityCommunity.ICreate;
  const createdCommunity =
    await api.functional.redditLikeCommunity.member.communities.create(
      memberConnection,
      { body: communityBody },
    );
  typia.assert(createdCommunity);
  // Verify created community has null icon_uri
  TestValidator.equals(
    "created community icon_uri is null",
    createdCommunity.icon_uri,
    null,
  );
  TestValidator.equals(
    "created community name matches",
    createdCommunity.name,
    communityBody.name,
  );
  TestValidator.equals(
    "created community description matches",
    createdCommunity.description,
    communityBody.description,
  );
  // 3. Retrieve the community using the public endpoint
  const retrievalConnection: api.IConnection = { host: connection.host };
  const retrievedCommunity =
    await api.functional.redditLikeCommunity.communities.at(
      retrievalConnection,
      { communityId: createdCommunity.id },
    );
  typia.assert(retrievedCommunity);
  // 4. Validate retrieved community
  TestValidator.equals(
    "retrieved community name matches",
    retrievedCommunity.name,
    communityBody.name,
  );
  TestValidator.equals(
    "retrieved community description matches",
    retrievedCommunity.description,
    communityBody.description,
  );
  // Verify icon_uri is explicitly null (not omitted)
  TestValidator.equals(
    "icon_uri is null for community without icon",
    retrievedCommunity.icon_uri,
    null,
  );
  // Verify deleted_at is null (active community)
  TestValidator.equals(
    "community is active (deleted_at is null)",
    retrievedCommunity.deleted_at,
    null,
  );
  // Verify creator contains valid member summary
  TestValidator.equals(
    "creator id matches member id",
    retrievedCommunity.creator.id,
    member.id,
  );
  TestValidator.equals(
    "creator username matches",
    retrievedCommunity.creator.username,
    member.username,
  );
  TestValidator.equals(
    "creator email matches",
    retrievedCommunity.creator.email,
    member.email,
  );
}
