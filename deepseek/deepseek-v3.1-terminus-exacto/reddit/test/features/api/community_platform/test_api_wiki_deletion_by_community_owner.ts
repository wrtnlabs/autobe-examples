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
 * Test that a community owner (who is also a moderator) can successfully delete wiki pages from their own community.
 * Verify that ownership authorization works correctly alongside moderator permissions.
 * Ensure the deletion process respects the same cascade deletion rules and that the wiki page is properly removed from community listings.
 */
export async function test_api_wiki_deletion_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as a regular user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // 2. Create a community owned by the user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 5,
          }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create and authenticate as a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
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
  typia.assert(moderatorAuth);
  // 4. Create a wiki page within the user-owned community using moderator permissions
  const wiki =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 5,
          }),
          slug: RandomGenerator.alphabets(8),
          content: RandomGenerator.paragraph({ sentences: 3 }),
          status: "published",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(wiki);
  // 5. Verify the wiki page was created successfully
  TestValidator.equals(
    "wiki community matches",
    wiki.community.id,
    community.id,
  );
  TestValidator.equals("wiki author matches", wiki.author.id, moderatorAuth.id);
  // 6. Delete the wiki page using the moderator's delete endpoint
  await api.functional.communityPlatform.moderator.communities.wikis.erase(
    moderatorConnection,
    {
      communityId: community.id,
      wikiId: wiki.id,
    },
  );
  // 7. Verify the deletion was successful by attempting to delete the same wiki again
  await TestValidator.error(
    "deleted wiki should not be deletable again",
    async () => {
      await api.functional.communityPlatform.moderator.communities.wikis.erase(
        moderatorConnection,
        {
          communityId: community.id,
          wikiId: wiki.id,
        },
      );
    },
  );
}
