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

export async function test_api_community_flair_creation_with_custom_styling(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
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
  // Since we don't have community creation endpoints available,
  // we'll test the flair creation with a valid community ID format
  // but acknowledge that the community may not exist
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Create flair with custom styling options
  const flairBody = {
    display_text: RandomGenerator.paragraph({ sentences: 1 }),
    background_color: "#FF5733",
    text_color: "#FFFFFF",
    css_class: "custom-flair-style",
    is_active: true,
  } satisfies ICommunityPlatformCommunityFlair.ICreate;
  // Test flair creation - this may fail due to non-existent community
  // but we're testing the API call and validation logic
  const flair =
    await api.functional.communityPlatform.moderator.communities.flairs.create(
      moderatorConnection,
      {
        communityId,
        body: flairBody,
      },
    );
  typia.assert(flair);
  // Validate flair creation response
  TestValidator.equals(
    "display text matches",
    flair.display_text,
    flairBody.display_text,
  );
  TestValidator.equals(
    "background color matches",
    flair.background_color,
    flairBody.background_color,
  );
  TestValidator.equals(
    "text color matches",
    flair.text_color,
    flairBody.text_color,
  );
  TestValidator.equals(
    "css class matches",
    flair.css_class,
    flairBody.css_class,
  );
  TestValidator.predicate("flair is active", flair.is_active === true);
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      flair.id,
    ),
  );
  TestValidator.predicate(
    "has creation timestamp",
    flair.created_at !== null && flair.created_at !== undefined,
  );
  TestValidator.predicate(
    "has update timestamp",
    flair.updated_at !== null && flair.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is null for active flair",
    flair.deleted_at,
    null,
  );
  // Test color contrast business logic (valid colors should be accepted)
  TestValidator.predicate(
    "background color is valid hex",
    /^#[0-9A-F]{6}$/i.test(flair.background_color!),
  );
  TestValidator.predicate(
    "text color is valid hex",
    /^#[0-9A-F]{6}$/i.test(flair.text_color!),
  );
}
