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

/**
 * Test admin wiki update functionality with URL slug change validation.
 *
 * Scenario: Admin creates wiki page with original slug, then updates to new slug
 * while also updating title and content. Validates slug uniqueness constraint
 * and URL-safe format pattern enforcement.
 */
export async function test_api_admin_wiki_update_changes_url_slug(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create a community ID for the wiki page
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Create initial wiki page with original slug
  const initialWiki =
    await api.functional.communityPlatform.admin.communities.wikis.create(
      adminConnection,
      {
        communityId,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          slug: "old-wiki",
          content: RandomGenerator.paragraph({ sentences: 5 }),
          status: "published",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(initialWiki);
  // Test slug uniqueness constraint by trying to create duplicate
  await TestValidator.error("duplicate slug should fail", async () => {
    await api.functional.communityPlatform.admin.communities.wikis.create(
      adminConnection,
      {
        communityId,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          slug: "old-wiki", // Same slug as existing wiki
          content: RandomGenerator.paragraph({ sentences: 5 }),
          status: "published",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  });
  // Update wiki page with new slug, title, and content
  const updatedWiki =
    await api.functional.communityPlatform.admin.communities.wikis.update(
      adminConnection,
      {
        communityId,
        wikiId: initialWiki.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          slug: "new-wiki-page",
          content: RandomGenerator.paragraph({ sentences: 5 }),
          status: "published",
        } satisfies ICommunityPlatformCommunityWiki.IUpdate,
      },
    );
  typia.assert(updatedWiki);
  // Validate that slug was updated correctly
  TestValidator.equals(
    "slug should be updated",
    updatedWiki.slug,
    "new-wiki-page",
  );
  TestValidator.notEquals(
    "slug should be different from original",
    updatedWiki.slug,
    "old-wiki",
  );
  // Validate URL-safe format pattern
  TestValidator.predicate(
    "slug should match URL-safe pattern",
    /^[a-z0-9-]+$/.test(updatedWiki.slug),
  );
  // Validate that other fields were updated
  TestValidator.notEquals(
    "title should be updated",
    updatedWiki.title,
    initialWiki.title,
  );
  TestValidator.notEquals(
    "content should be updated",
    updatedWiki.content,
    initialWiki.content,
  );
  // Validate that ID remains the same (same entity)
  TestValidator.equals(
    "ID should remain the same",
    updatedWiki.id,
    initialWiki.id,
  );
  // Validate that community ID remains the same
  TestValidator.equals(
    "community ID should remain the same",
    updatedWiki.community.id,
    communityId,
  );
  // Test that the old slug can now be reused (since we updated the original wiki)
  const reusedSlugWiki =
    await api.functional.communityPlatform.admin.communities.wikis.create(
      adminConnection,
      {
        communityId,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          slug: "old-wiki", // Now available since original wiki was updated
          content: RandomGenerator.paragraph({ sentences: 5 }),
          status: "published",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(reusedSlugWiki);
  // Test invalid URL pattern rejection
  await TestValidator.error("invalid slug pattern should fail", async () => {
    await api.functional.communityPlatform.admin.communities.wikis.update(
      adminConnection,
      {
        communityId,
        wikiId: initialWiki.id,
        body: {
          slug: "Invalid Slug With Spaces", // Invalid pattern
        } satisfies ICommunityPlatformCommunityWiki.IUpdate,
      },
    );
  });
}
