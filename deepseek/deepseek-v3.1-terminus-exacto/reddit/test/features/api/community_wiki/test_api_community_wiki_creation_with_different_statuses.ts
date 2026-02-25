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

export async function test_api_community_wiki_creation_with_different_statuses(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Generate a community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Create wiki with 'draft' status
  const draftWiki =
    await generate_random_community_platform_admin_communities_wikis_create(
      adminConnection,
      {
        params: { communityId },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10),
          content: RandomGenerator.content({ paragraphs: 3 }),
          status: "draft",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(draftWiki);
  TestValidator.equals("draft wiki status", draftWiki.status, "draft");
  // Test 2: Create wiki with 'published' status
  const publishedWiki =
    await generate_random_community_platform_admin_communities_wikis_create(
      adminConnection,
      {
        params: { communityId },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10),
          content: RandomGenerator.content({ paragraphs: 3 }),
          status: "published",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(publishedWiki);
  TestValidator.equals(
    "published wiki status",
    publishedWiki.status,
    "published",
  );
  // Test 3: Create wiki with 'archived' status
  const archivedWiki =
    await generate_random_community_platform_admin_communities_wikis_create(
      adminConnection,
      {
        params: { communityId },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10),
          content: RandomGenerator.content({ paragraphs: 3 }),
          status: "archived",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(archivedWiki);
  TestValidator.equals("archived wiki status", archivedWiki.status, "archived");
  // Test 4: Create wiki without explicit status (test default behavior)
  const defaultWiki =
    await generate_random_community_platform_admin_communities_wikis_create(
      adminConnection,
      {
        params: { communityId },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10),
          content: RandomGenerator.content({ paragraphs: 3 }),
          // status field omitted to test default
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(defaultWiki);
  TestValidator.predicate(
    "default wiki has status field",
    defaultWiki.status !== undefined,
  );
  // Validate community relationship
  TestValidator.equals(
    "draft wiki community id",
    draftWiki.community.id,
    communityId,
  );
  TestValidator.equals(
    "published wiki community id",
    publishedWiki.community.id,
    communityId,
  );
  TestValidator.equals(
    "archived wiki community id",
    archivedWiki.community.id,
    communityId,
  );
  TestValidator.equals(
    "default wiki community id",
    defaultWiki.community.id,
    communityId,
  );
}
