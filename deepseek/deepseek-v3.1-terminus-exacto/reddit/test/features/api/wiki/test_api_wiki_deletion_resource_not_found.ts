import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test error handling when attempting to delete non-existent wiki pages or wiki pages in non-existent communities.
 * Verify that appropriate error responses are returned for invalid community IDs and wiki page IDs.
 * Ensure the system properly validates resource existence before attempting deletion operations.
 */
export async function test_api_wiki_deletion_resource_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Authenticate as moderator
  await authorize_moderator_join(moderatorConnection, {
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
  // Generate multiple non-existent IDs for comprehensive testing
  const nonExistentCommunityId1 = typia.random<string & tags.Format<"uuid">>();
  const nonExistentCommunityId2 = typia.random<string & tags.Format<"uuid">>();
  const nonExistentWikiId1 = typia.random<string & tags.Format<"uuid">>();
  const nonExistentWikiId2 = typia.random<string & tags.Format<"uuid">>();
  // Test multiple invalid combinations
  await TestValidator.error(
    "should fail when deleting wiki from non-existent community",
    async () => {
      await api.functional.communityPlatform.moderator.communities.wikis.erase(
        moderatorConnection,
        {
          communityId: nonExistentCommunityId1,
          wikiId: nonExistentWikiId1,
        },
      );
    },
  );
  await TestValidator.error(
    "should fail when deleting non-existent wiki from non-existent community",
    async () => {
      await api.functional.communityPlatform.moderator.communities.wikis.erase(
        moderatorConnection,
        {
          communityId: nonExistentCommunityId2,
          wikiId: nonExistentWikiId2,
        },
      );
    },
  );
}
