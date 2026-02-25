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

export async function test_api_admin_wiki_update_status_transition_draft_to_published(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create wiki page with draft status
  const wikiCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphabets(10),
    content: RandomGenerator.paragraph({ sentences: 5 }),
    status: "draft" as const,
  } satisfies ICommunityPlatformCommunityWiki.ICreate;
  const createdWiki =
    await api.functional.communityPlatform.admin.communities.wikis.create(
      adminConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: wikiCreateBody,
      },
    );
  typia.assert(createdWiki);
  // Verify initial status is draft
  TestValidator.equals(
    "initial status should be draft",
    createdWiki.status,
    "draft",
  );
  // Update wiki page to published status
  const wikiUpdateBody = {
    status: "published" as const,
  } satisfies ICommunityPlatformCommunityWiki.IUpdate;
  const updatedWiki =
    await api.functional.communityPlatform.admin.communities.wikis.update(
      adminConnection,
      {
        communityId: createdWiki.community.id,
        wikiId: createdWiki.id,
        body: wikiUpdateBody,
      },
    );
  typia.assert(updatedWiki);
  // Verify status changed to published
  TestValidator.equals(
    "status should be published",
    updatedWiki.status,
    "published",
  );
  // Verify other fields remain unchanged
  TestValidator.equals(
    "title should remain unchanged",
    updatedWiki.title,
    createdWiki.title,
  );
  TestValidator.equals(
    "slug should remain unchanged",
    updatedWiki.slug,
    createdWiki.slug,
  );
  TestValidator.equals(
    "content should remain unchanged",
    updatedWiki.content,
    createdWiki.content,
  );
  // Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at should change",
    updatedWiki.updated_at,
    createdWiki.updated_at,
  );
  // Verify community and author remain the same
  TestValidator.equals(
    "community should remain same",
    updatedWiki.community.id,
    createdWiki.community.id,
  );
  TestValidator.equals(
    "author should remain same",
    updatedWiki.author.id,
    createdWiki.author.id,
  );
}
