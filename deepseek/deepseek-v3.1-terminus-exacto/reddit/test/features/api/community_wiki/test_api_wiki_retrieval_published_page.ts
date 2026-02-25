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

export async function test_api_wiki_retrieval_published_page(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(user);
  // Step 2: Create community as the user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // Step 3: Create moderator user for wiki creation
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderator);
  // Step 4: Create wiki page with published status
  const wikiCreateData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphabets(10).toLowerCase().replace(/\s+/g, "-"),
    content: RandomGenerator.content({ paragraphs: 2 }),
    status: "published" as const,
  } satisfies ICommunityPlatformCommunityWiki.ICreate;
  const wiki =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        body: wikiCreateData,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(wiki);
  // Step 5: Retrieve the published wiki page using the target endpoint
  const wikiRetrieved =
    await api.functional.communityPlatform.communities.wikis.at(
      connection, // Public endpoint, no authentication needed
      {
        communityId: community.id,
        wikiId: wiki.id,
      },
    );
  typia.assert(wikiRetrieved);
  // Step 6: Validate all expected fields are present and correct
  TestValidator.equals("wiki id matches", wikiRetrieved.id, wiki.id);
  TestValidator.equals(
    "wiki title matches",
    wikiRetrieved.title,
    wikiCreateData.title,
  );
  TestValidator.equals(
    "wiki slug matches",
    wikiRetrieved.slug,
    wikiCreateData.slug,
  );
  TestValidator.equals(
    "wiki content matches",
    wikiRetrieved.content,
    wikiCreateData.content,
  );
  TestValidator.equals(
    "wiki status is published",
    wikiRetrieved.status,
    "published",
  );
  TestValidator.equals(
    "community id matches",
    wikiRetrieved.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    wikiRetrieved.community.name,
    community.name,
  );
  TestValidator.equals(
    "author id matches",
    wikiRetrieved.author.id,
    moderator.id,
  );
  TestValidator.equals(
    "author username matches",
    wikiRetrieved.author.username,
    moderator.username,
  );
  TestValidator.predicate("created_at is valid date string", () => {
    return !isNaN(Date.parse(wikiRetrieved.created_at));
  });
  TestValidator.predicate("updated_at is valid date string", () => {
    return !isNaN(Date.parse(wikiRetrieved.updated_at));
  });
  TestValidator.equals(
    "deleted_at is null for active wiki",
    wikiRetrieved.deleted_at,
    null,
  );
  // Step 7: Verify public accessibility - retrieve with fresh unauthenticated connection
  const publicConnection: api.IConnection = { host: connection.host };
  const publicWiki =
    await api.functional.communityPlatform.communities.wikis.at(
      publicConnection,
      {
        communityId: community.id,
        wikiId: wiki.id,
      },
    );
  typia.assert(publicWiki);
  TestValidator.equals(
    "public access returns same wiki",
    publicWiki.id,
    wiki.id,
  );
  // Step 8: Additional business logic validation
  TestValidator.notEquals(
    "created_at and updated_at should be valid",
    wikiRetrieved.created_at,
    "",
  );
  TestValidator.notEquals(
    "updated_at should be valid",
    wikiRetrieved.updated_at,
    "",
  );
  TestValidator.predicate("community summary has required fields", () => {
    return (
      wikiRetrieved.community.id.length > 0 &&
      wikiRetrieved.community.name.length > 0 &&
      wikiRetrieved.community.description.length > 0 &&
      wikiRetrieved.community.created_at.length > 0
    );
  });
  TestValidator.predicate("author summary has required fields", () => {
    return (
      wikiRetrieved.author.id.length > 0 &&
      wikiRetrieved.author.username.length > 0 &&
      wikiRetrieved.author.created_at.length > 0
    );
  });
}
