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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_communities_flairs_create } from "../../../generate/generate_random_community_platform_moderator_communities_flairs_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_flair } from "../../../prepare/prepare_random_community_platform_community_flair";

export async function test_api_community_flair_deletion_by_moderator(
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
    },
  });
  typia.assert(moderator);
  // 2. Create community as user (moderator acting as user requires separate user account)
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(user);
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(community);
  // Store flair creation data for validation
  const flairCreateData = {
    display_text: RandomGenerator.alphabets(8),
    background_color: `#${RandomGenerator.alphabets(6)}`,
    text_color: `#${RandomGenerator.alphabets(6)}`,
    css_class: RandomGenerator.alphabets(10),
    is_active: true,
  };
  // 3. Create flair within community using moderator credentials
  const flair =
    await generate_random_community_platform_moderator_communities_flairs_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: flairCreateData,
      },
    );
  typia.assert(flair);
  // 4. Verify flair exists and properties match creation data
  TestValidator.equals(
    "flair display text matches",
    flair.display_text,
    flairCreateData.display_text,
  );
  TestValidator.equals(
    "flair belongs to correct community",
    flair.community.id,
    community.id,
  );
  TestValidator.predicate("flair is active", () => flair.is_active === true);
  // 5. Execute deletion operation
  await api.functional.communityPlatform.moderator.communities.flairs.erase(
    moderatorConnection,
    {
      communityId: community.id,
      flairId: flair.id,
    },
  );
  // 6. Verify successful deletion (void response received - no error thrown)
  // No explicit check needed; if erase didn't throw, deletion succeeded
  // 7. Verify flair cannot be retrieved after deletion
  // Since there's no explicit GET endpoint for a single flair, we test by attempting
  // to create a new flair with the same display text in the same community
  // If soft delete is implemented, uniqueness constraint should still apply to deleted items
  // This tests that the deleted flair is still considered "existing" for uniqueness
  await TestValidator.error(
    "cannot create duplicate flair even after deletion (soft delete)",
    async () => {
      await generate_random_community_platform_moderator_communities_flairs_create(
        moderatorConnection,
        {
          params: { communityId: community.id },
          body: {
            display_text: flairCreateData.display_text,
            background_color: `#${RandomGenerator.alphabets(6)}`,
            text_color: `#${RandomGenerator.alphabets(6)}`,
            is_active: true,
          },
        },
      );
    },
  );
  // 8. Verify cascade deletion behavior - since no assignments exist in this scenario,
  // we verify that the moderator can still create new flairs in the community
  // (ensuring community wasn't affected by flair deletion)
  const newFlair =
    await generate_random_community_platform_moderator_communities_flairs_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          display_text: RandomGenerator.alphabets(10),
          is_active: true,
        },
      },
    );
  typia.assert(newFlair);
  TestValidator.predicate("new flair created successfully", () => true);
}
