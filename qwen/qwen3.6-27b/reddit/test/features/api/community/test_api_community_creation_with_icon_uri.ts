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
 * Test community creation with optional icon_uri field included.
 *
 * Validates that a registered member can create a new community with name, description, and an optional icon_uri field. Ensures the icon_uri is correctly stored and returned in the response, the creator member is properly assigned, and all timestamps are populated.
 *
 * Special attention is given to verifying that the optional icon_uri field is accepted, stored as provided, and returned correctly in the community entity response.
 *
 * 1. Register and authenticate a new member account.
 * 2. Generate a valid icon URI to be used in community creation.
 * 3. Member creates a new community with name, description, and icon_uri.
 * 4. Validate the response contains all fields, icon_uri matches input, creator is assigned, and timestamps exist.
 */
export async function test_api_community_creation_with_icon_uri(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(authorizedMember);
  // 2. Prepare icon_uri value
  const iconUri: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  // 3. Create community with icon_uri
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          icon_uri: iconUri,
        },
      },
    );
  typia.assert(community);
  // 4. Validate response - business logic only (typia.assert already validates types)
  TestValidator.equals("icon_uri matches input", community.icon_uri, iconUri);
  TestValidator.equals(
    "creator matches authenticated member id",
    community.creator.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "creator username matches authenticated member",
    community.creator.username,
    authorizedMember.username,
  );
}
