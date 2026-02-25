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

export async function test_api_moderator_flair_update_duplicate_display_text(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
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
  // Create a community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Create first flair with display_text 'Verified'
  const flairA =
    await generate_random_community_platform_moderator_communities_flairs_create(
      moderatorConnection,
      {
        body: {
          display_text: "Verified",
          background_color: "#FF0000",
          text_color: "#FFFFFF",
          css_class: "verified-flair",
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
        params: { communityId },
      },
    );
  typia.assert(flairA);
  // Create second flair with display_text 'Contributor'
  const flairB =
    await generate_random_community_platform_moderator_communities_flairs_create(
      moderatorConnection,
      {
        body: {
          display_text: "Contributor",
          background_color: "#00FF00",
          text_color: "#000000",
          css_class: "contributor-flair",
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
        params: { communityId },
      },
    );
  typia.assert(flairB);
  // Store original flair B data for comparison
  const originalFlairB = { ...flairB };
  // Attempt to update Flair B to have display_text 'Verified' (duplicate of Flair A)
  await TestValidator.httpError(
    "duplicate display_text should return 409",
    409,
    async () => {
      await api.functional.communityPlatform.moderator.communities.flairs.update(
        moderatorConnection,
        {
          communityId,
          flairId: flairB.id,
          body: {
            display_text: "Verified",
          } satisfies ICommunityPlatformCommunityFlair.IUpdate,
        },
      );
    },
  );
  // Verify Flair B remains unchanged by retrieving it again
  // Since there's no utility function for retrieval, use the SDK directly
  const retrievedFlairB =
    await api.functional.communityPlatform.moderator.communities.flairs.update(
      moderatorConnection,
      {
        communityId,
        flairId: flairB.id,
        body: {
          // Empty update to retrieve current state
        } satisfies ICommunityPlatformCommunityFlair.IUpdate,
      },
    );
  typia.assert(retrievedFlairB);
  TestValidator.equals(
    "Flair B display_text unchanged",
    retrievedFlairB.display_text,
    originalFlairB.display_text,
  );
  TestValidator.equals(
    "Flair B background_color unchanged",
    retrievedFlairB.background_color,
    originalFlairB.background_color,
  );
  TestValidator.equals(
    "Flair B text_color unchanged",
    retrievedFlairB.text_color,
    originalFlairB.text_color,
  );
  TestValidator.equals(
    "Flair B css_class unchanged",
    retrievedFlairB.css_class,
    originalFlairB.css_class,
  );
  TestValidator.equals(
    "Flair B is_active unchanged",
    retrievedFlairB.is_active,
    originalFlairB.is_active,
  );
  // Verify both flairs still exist and are separate
  TestValidator.notEquals(
    "flairs should have different IDs",
    flairA.id,
    flairB.id,
  );
  TestValidator.equals(
    "Flair A display_text remains 'Verified'",
    flairA.display_text,
    "Verified",
  );
  TestValidator.equals(
    "Flair B display_text remains 'Contributor'",
    retrievedFlairB.display_text,
    "Contributor",
  );
}
