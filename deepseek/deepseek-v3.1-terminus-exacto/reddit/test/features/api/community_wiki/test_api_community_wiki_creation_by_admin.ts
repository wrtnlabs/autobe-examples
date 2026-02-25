import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityWiki } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityWiki";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_communities_wikis_create } from "../../../generate/generate_random_community_platform_admin_communities_wikis_create";
import { prepare_random_community_platform_community_wiki } from "../../../prepare/prepare_random_community_platform_community_wiki";

export async function test_api_community_wiki_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Generate a community ID for testing (in real scenario, this would come from an existing community)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Create wiki page data with unique slug
  const wikiData: ICommunityPlatformCommunityWiki.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphabets(10),
    content: RandomGenerator.content({ paragraphs: 3 }),
    status: "published",
  } satisfies ICommunityPlatformCommunityWiki.ICreate;
  // Create wiki page using the utility function
  const wiki =
    await generate_random_community_platform_admin_communities_wikis_create(
      adminConnection,
      {
        body: wikiData,
        params: {
          communityId: communityId,
        },
      },
    );
  typia.assert(wiki);
  // Validate wiki page properties
  TestValidator.equals("wiki title matches", wiki.title, wikiData.title);
  TestValidator.equals("wiki slug matches", wiki.slug, wikiData.slug);
  TestValidator.equals("wiki content matches", wiki.content, wikiData.content);
  TestValidator.equals("wiki status matches", wiki.status, wikiData.status);
  TestValidator.equals("wiki author is admin", wiki.author.id, admin.id);
  TestValidator.predicate(
    "wiki has creation timestamp",
    wiki.created_at !== undefined,
  );
  TestValidator.predicate(
    "wiki has update timestamp",
    wiki.updated_at !== undefined,
  );
  TestValidator.equals("wiki deleted_at is null", wiki.deleted_at, null);
  // Test slug uniqueness by attempting to create another wiki with the same slug
  await TestValidator.error("duplicate slug should fail", async () => {
    await generate_random_community_platform_admin_communities_wikis_create(
      adminConnection,
      {
        body: {
          ...wikiData,
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
        params: {
          communityId: communityId,
        },
      },
    );
  });
}
