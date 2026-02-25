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

export async function test_api_community_wiki_content_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
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
  // 2. Create wiki content with minimum required fields including rich text
  const wikiBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    slug: RandomGenerator.alphabets(10),
    content: RandomGenerator.content({ paragraphs: 2 }),
    status: "published" as const,
  } satisfies ICommunityPlatformCommunityWiki.ICreate;
  // 3. Use a valid community ID (in real scenario, this would come from an existing community)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create wiki using generation function
  const wiki =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        body: wikiBody,
        params: {
          communityId: communityId,
        },
      },
    );
  typia.assert(wiki);
  // 5. Validate wiki content and relationships
  TestValidator.equals("title matches input", wiki.title, wikiBody.title);
  TestValidator.equals("slug matches input", wiki.slug, wikiBody.slug);
  TestValidator.equals("content matches input", wiki.content, wikiBody.content);
  TestValidator.equals("status matches input", wiki.status, wikiBody.status);
  TestValidator.equals(
    "author matches moderator",
    wiki.author.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "community ID matches path parameter",
    wiki.community.id,
    communityId,
  );
  TestValidator.predicate(
    "soft delete field is null",
    wiki.deleted_at === null,
  );
  TestValidator.predicate(
    "content contains rich text",
    wiki.content.length > 0,
  );
  TestValidator.predicate(
    "community has valid name",
    wiki.community.name.length > 0,
  );
  TestValidator.predicate(
    "author has valid username",
    wiki.author.username.length > 0,
  );
}
