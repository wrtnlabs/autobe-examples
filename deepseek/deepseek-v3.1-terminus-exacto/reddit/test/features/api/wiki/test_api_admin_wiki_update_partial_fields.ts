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

export async function test_api_admin_wiki_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup with authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate a random community ID for wiki creation
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create initial wiki page using utility function
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphabets(10).toLowerCase(),
    content: RandomGenerator.content({ paragraphs: 1 }),
    status: "draft" as const,
  } satisfies ICommunityPlatformCommunityWiki.ICreate;
  const wiki =
    await generate_random_community_platform_admin_communities_wikis_create(
      adminConnection,
      {
        body: createBody,
        params: {
          communityId,
        },
      },
    );
  typia.assert(wiki);
  // Store original values for comparison
  const originalSlug = wiki.slug;
  const originalStatus = wiki.status;
  const originalCommunityId = wiki.community.id;
  const originalAuthorId = wiki.author.id;
  const originalCreatedAt = wiki.created_at;
  // 3. Partial update - only title and content
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformCommunityWiki.IUpdate;
  const updatedWiki =
    await api.functional.communityPlatform.admin.communities.wikis.update(
      adminConnection,
      {
        communityId,
        wikiId: wiki.id,
        body: updateBody,
      },
    );
  typia.assert(updatedWiki);
  // 4. Validate updated fields
  TestValidator.equals(
    "title should be updated",
    updatedWiki.title,
    updateBody.title!,
  );
  TestValidator.equals(
    "content should be updated",
    updatedWiki.content,
    updateBody.content!,
  );
  TestValidator.notEquals(
    "updated_at should change",
    updatedWiki.updated_at,
    wiki.updated_at,
  );
  // 5. Validate unchanged fields
  TestValidator.equals(
    "slug should remain unchanged",
    updatedWiki.slug,
    originalSlug,
  );
  TestValidator.equals(
    "status should remain unchanged",
    updatedWiki.status,
    originalStatus,
  );
  TestValidator.equals(
    "community ID should remain unchanged",
    updatedWiki.community.id,
    originalCommunityId,
  );
  TestValidator.equals(
    "author ID should remain unchanged",
    updatedWiki.author.id,
    originalAuthorId,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedWiki.created_at,
    originalCreatedAt,
  );
}
