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
import { generate_random_community_platform_moderator_communities_wikis_create } from "../../../generate/generate_random_community_platform_moderator_communities_wikis_create";
import { prepare_random_community_platform_community_wiki } from "../../../prepare/prepare_random_community_platform_community_wiki";

export async function test_api_community_wiki_creation_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Generate a random community ID for wiki creation
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Create first wiki page with published status using utility function
  const wikiData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphabets(10),
    content: RandomGenerator.content({ paragraphs: 3 }),
    status: "published",
  } satisfies ICommunityPlatformCommunityWiki.ICreate;
  const wiki =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        body: wikiData,
        params: { communityId },
      },
    );
  typia.assert(wiki);
  // Validate wiki response structure
  TestValidator.equals("wiki title matches input", wiki.title, wikiData.title);
  TestValidator.equals("wiki slug matches input", wiki.slug, wikiData.slug);
  TestValidator.equals(
    "wiki content matches input",
    wiki.content,
    wikiData.content,
  );
  TestValidator.equals(
    "wiki status matches input",
    wiki.status,
    wikiData.status,
  );
  TestValidator.equals(
    "deleted_at is null for active wiki",
    wiki.deleted_at,
    null,
  );
  // Validate author relationship (should be the authenticated moderator)
  TestValidator.equals(
    "author id matches moderator id",
    wiki.author.id,
    moderator.id,
  );
  TestValidator.equals(
    "author username matches moderator username",
    wiki.author.username,
    moderator.username,
  );
  // Validate community relationship
  TestValidator.equals(
    "community id matches input",
    wiki.community.id,
    communityId,
  );
  // Test slug uniqueness constraint
  await TestValidator.error("duplicate slug should fail", async () => {
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          slug: wikiData.slug, // Same slug
          content: RandomGenerator.content({ paragraphs: 2 }),
          status: "draft",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
        params: { communityId },
      },
    );
  });
}
