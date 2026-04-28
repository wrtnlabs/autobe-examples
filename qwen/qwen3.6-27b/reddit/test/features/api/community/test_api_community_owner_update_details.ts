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
 * Test community owner updates their own community details.
 *
 * Validates the complete community update flow: member authentication, community creation, and subsequent update of name, description, and icon URI. Verifies that the updated fields reflect the new values while immutable fields (id, creator_id, created_at) remain unchanged and the updated_at timestamp changes.
 *
 * 1. A new member registers and authenticates on the platform.
 * 2. The authenticated member creates a new community with initial name, description, and icon URI.
 * 3. The member updates the community details with new values.
 * 4. Validates the updated community reflects the new name, description, and icon_uri, while id, creator_id, and created_at remain unchanged, and updated_at timestamp has changed.
 */
export async function test_api_community_owner_update_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create community
  const originalCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          icon_uri: null,
        },
      },
    );
  typia.assert(originalCommunity);
  // 3. Update community with new details
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedIconUri = typia.random<string & tags.Format<"uri">>();
  const updatedCommunity =
    await api.functional.redditLikeCommunity.member.communities.update(
      memberConnection,
      {
        communityId: originalCommunity.id,
        body: {
          name: updatedName,
          description: updatedDescription,
          icon_uri: updatedIconUri,
        } satisfies IREdditLikeCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // 4. Validate updated fields
  TestValidator.equals(
    "updated name matches input",
    updatedCommunity.name,
    updatedName,
  );
  TestValidator.equals(
    "updated description matches input",
    updatedCommunity.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated icon_uri matches input",
    updatedCommunity.icon_uri,
    updatedIconUri,
  );
  // 5. Validate immutable fields unchanged
  TestValidator.equals(
    "community id unchanged",
    updatedCommunity.id,
    originalCommunity.id,
  );
  TestValidator.equals(
    "creator id unchanged",
    updatedCommunity.creator.id,
    originalCommunity.creator.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedCommunity.created_at,
    originalCommunity.created_at,
  );
  // 6. Validate updated_at changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedCommunity.updated_at,
    originalCommunity.updated_at,
  );
}
