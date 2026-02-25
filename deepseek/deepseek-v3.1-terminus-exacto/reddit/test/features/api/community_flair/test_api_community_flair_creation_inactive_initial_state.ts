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

export async function test_api_community_flair_creation_inactive_initial_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator connection
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
  // 2. Generate a random community ID (assuming it exists or we'll test error)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create flair with explicit is_active: false
  const body = {
    display_text: RandomGenerator.paragraph({ sentences: 1 }),
    background_color: "#FF0000",
    text_color: "#FFFFFF",
    css_class: "test-flair",
    is_active: false,
  } satisfies ICommunityPlatformCommunityFlair.ICreate;
  const flair =
    await generate_random_community_platform_moderator_communities_flairs_create(
      moderatorConnection,
      {
        body,
        params: { communityId },
      },
    );
  typia.assert(flair);
  // 4. Validate response
  TestValidator.equals(
    "flair is_active should be false",
    flair.is_active,
    false,
  );
  TestValidator.equals(
    "display_text matches",
    flair.display_text,
    body.display_text,
  );
  TestValidator.equals(
    "background_color matches",
    flair.background_color,
    body.background_color,
  );
  TestValidator.equals("text_color matches", flair.text_color, body.text_color);
  TestValidator.equals("css_class matches", flair.css_class, body.css_class);
  TestValidator.predicate(
    "flair has community",
    () => flair.community !== null,
  );
}
