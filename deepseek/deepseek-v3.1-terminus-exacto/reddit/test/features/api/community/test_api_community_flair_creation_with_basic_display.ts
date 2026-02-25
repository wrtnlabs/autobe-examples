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

export async function test_api_community_flair_creation_with_basic_display(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
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
  typia.assert(moderatorAuth);
  // Generate a random community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Create first flair with minimal required fields using utility function
  const flairBody = {
    display_text: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies ICommunityPlatformCommunityFlair.ICreate;
  const flair =
    await generate_random_community_platform_moderator_communities_flairs_create(
      moderatorConnection,
      {
        body: flairBody,
        params: {
          communityId,
        },
      },
    );
  typia.assert(flair);
  // Validate response structure and default values (business logic only)
  TestValidator.equals(
    "display_text matches input",
    flair.display_text,
    flairBody.display_text,
  );
  TestValidator.equals("is_active defaults to true", flair.is_active, true);
  TestValidator.equals(
    "background_color defaults to null",
    flair.background_color,
    null,
  );
  TestValidator.equals("text_color defaults to null", flair.text_color, null);
  TestValidator.equals("css_class defaults to null", flair.css_class, null);
  TestValidator.equals("deleted_at is null", flair.deleted_at, null);
  TestValidator.equals("community ID matches", flair.community.id, communityId);
  // Test uniqueness constraint by attempting to create duplicate flair
  await TestValidator.error("duplicate display_text should fail", async () => {
    await generate_random_community_platform_moderator_communities_flairs_create(
      moderatorConnection,
      {
        body: {
          display_text: flairBody.display_text,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
        params: {
          communityId,
        },
      },
    );
  });
}
