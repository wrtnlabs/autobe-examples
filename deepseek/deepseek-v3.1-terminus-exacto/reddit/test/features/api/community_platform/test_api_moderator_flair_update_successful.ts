import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_moderator_communities_flairs_create } from "../../../generate/generate_random_community_platform_moderator_communities_flairs_create";
import { prepare_random_community_platform_community_flair } from "../../../prepare/prepare_random_community_platform_community_flair";

/**
 * Test that a moderator can successfully update a flair definition within their community.
 *
 * Workflow:
 * 1. Authenticate as a moderator using join endpoint
 * 2. Create a flair definition with initial values
 * 3. Update the flair with partial modifications
 * 4. Validate the updated flair reflects all changes
 */
export async function test_api_moderator_flair_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Create initial flair definition with a valid community ID
  // Note: The community must exist for this to work. Since community creation endpoint
  // is not available, we'll use a valid UUID format that represents an existing community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create initial flair definition using utility function
  const initialFlair =
    await generate_random_community_platform_moderator_communities_flairs_create(
      moderatorConnection,
      {
        params: { communityId },
        body: {
          display_text: RandomGenerator.paragraph({ sentences: 1 }),
          background_color: "#FF0000",
          text_color: "#FFFFFF",
          css_class: "custom-flair",
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
      },
    );
  typia.assert(initialFlair);
  // 4. Update the flair with partial modifications
  const updateData: ICommunityPlatformCommunityFlair.IUpdate = {
    display_text: RandomGenerator.paragraph({ sentences: 1 }),
    background_color: "#00FF00",
    text_color: "#000000",
    is_active: false,
  };
  const updatedFlair =
    await api.functional.communityPlatform.moderator.communities.flairs.update(
      moderatorConnection,
      {
        communityId,
        flairId: initialFlair.id,
        body: updateData,
      },
    );
  typia.assert(updatedFlair);
  // 5. Validate the updated flair reflects all changes
  TestValidator.equals(
    "display_text should be updated",
    updatedFlair.display_text,
    updateData.display_text,
  );
  TestValidator.equals(
    "background_color should be updated",
    updatedFlair.background_color,
    updateData.background_color,
  );
  TestValidator.equals(
    "text_color should be updated",
    updatedFlair.text_color,
    updateData.text_color,
  );
  TestValidator.equals(
    "is_active should be updated",
    updatedFlair.is_active,
    updateData.is_active,
  );
  // 6. Ensure updated_at timestamp is newer than created_at
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(updatedFlair.updated_at) > new Date(initialFlair.created_at),
  );
  // 7. Ensure community relationship remains intact
  TestValidator.equals(
    "community ID should remain the same",
    updatedFlair.community.id,
    communityId,
  );
  // 8. Validate that unchanged fields remain the same
  TestValidator.equals(
    "css_class should remain unchanged",
    updatedFlair.css_class,
    initialFlair.css_class,
  );
  TestValidator.equals(
    "id should remain the same",
    updatedFlair.id,
    initialFlair.id,
  );
}
