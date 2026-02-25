import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityWiki } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityWiki";
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
import { generate_random_community_platform_moderator_communities_wikis_create } from "../../../generate/generate_random_community_platform_moderator_communities_wikis_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_wiki } from "../../../prepare/prepare_random_community_platform_community_wiki";

export async function test_api_community_wiki_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection for wiki creation (requires moderator permissions)
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Create user connection for wiki author (will be used for update)
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community using user connection (user can create communities)
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create wiki page as moderator (requires moderator permissions)
  const wiki =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(10),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          status: "draft" as const,
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(wiki);
  // Update wiki page with partial fields (content and status only) using user connection
  const updatedWiki =
    await api.functional.communityPlatform.moderator.communities.wikis.update(
      userConnection,
      {
        communityId: community.id,
        wikiId: wiki.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 8 }),
          status: "published" as const,
        } satisfies ICommunityPlatformCommunityWiki.IUpdate,
      },
    );
  typia.assert(updatedWiki);
  // Validate that content is updated (should be different from original)
  TestValidator.notEquals(
    "content should be updated",
    updatedWiki.content,
    wiki.content,
  );
  // Validate that status is updated (should be different from original)
  TestValidator.notEquals(
    "status should be updated",
    updatedWiki.status,
    wiki.status,
  );
  TestValidator.equals(
    "status should be published",
    updatedWiki.status,
    "published",
  );
  // Validate that title and slug remain unchanged
  TestValidator.equals(
    "title should remain unchanged",
    updatedWiki.title,
    wiki.title,
  );
  TestValidator.equals(
    "slug should remain unchanged",
    updatedWiki.slug,
    wiki.slug,
  );
  // Validate that community and author relationships are preserved
  TestValidator.equals(
    "community should remain same",
    updatedWiki.community.id,
    wiki.community.id,
  );
  TestValidator.equals(
    "author should remain same",
    updatedWiki.author.id,
    wiki.author.id,
  );
  // Validate that created_at is preserved but updated_at is newer
  TestValidator.equals(
    "created_at should be preserved",
    updatedWiki.created_at,
    wiki.created_at,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(updatedWiki.updated_at) > new Date(wiki.updated_at),
  );
}
