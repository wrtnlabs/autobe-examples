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

/**
 * Test community moderator updating a wiki page for collaborative documentation maintenance.
 *
 * This test validates that community moderators can update wiki pages within their moderated
 * communities, including title, slug, content, and status changes. The workflow demonstrates
 * proper permission checking where moderators can edit any wiki content regardless of authorship.
 */
export async function test_api_community_wiki_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as community owner
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
  // 2. Create community as owner
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create and authenticate as moderator
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
  // 4. Create initial wiki page
  const initialWiki =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 6,
          }),
          slug: RandomGenerator.alphabets(8),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          status: "draft",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(initialWiki);
  // 5. Update wiki page with new values
  const updateData: ICommunityPlatformCommunityWiki.IUpdate = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 8 }),
    slug: RandomGenerator.alphabets(10),
    content: RandomGenerator.paragraph({ sentences: 8 }),
    status: "published",
  };
  const updatedWiki =
    await api.functional.communityPlatform.moderator.communities.wikis.update(
      moderatorConnection,
      {
        communityId: community.id,
        wikiId: initialWiki.id,
        body: updateData,
      },
    );
  typia.assert(updatedWiki);
  // 6. Validate the updates
  TestValidator.equals(
    "wiki ID remains the same",
    updatedWiki.id,
    initialWiki.id,
  );
  TestValidator.equals("title is updated", updatedWiki.title, updateData.title);
  TestValidator.equals("slug is updated", updatedWiki.slug, updateData.slug);
  TestValidator.equals(
    "content is updated",
    updatedWiki.content,
    updateData.content,
  );
  TestValidator.equals(
    "status is updated",
    updatedWiki.status,
    updateData.status,
  );
  TestValidator.equals(
    "community remains the same",
    updatedWiki.community.id,
    community.id,
  );
  TestValidator.equals(
    "author remains the same",
    updatedWiki.author.id,
    initialWiki.author.id,
  );
  TestValidator.predicate(
    "updated_at timestamp is newer",
    new Date(updatedWiki.updated_at) > new Date(initialWiki.updated_at),
  );
}
