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

export async function test_api_community_wiki_draft_status(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Authenticate as moderator
  const moderator = await authorize_moderator_join(moderatorConnection, {
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
  typia.assert(moderator);
  // Generate a random community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Create wiki with explicit 'draft' status using utility function
  const wikiWithExplicitDraft =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(10),
          content: RandomGenerator.paragraph({ sentences: 3 }),
          status: "draft",
        },
        params: {
          communityId,
        },
      },
    );
  typia.assert(wikiWithExplicitDraft);
  // Test 2: Create wiki without specifying status (should default to 'draft') using utility function
  const wikiWithDefaultStatus =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(10),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
        params: {
          communityId,
        },
      },
    );
  typia.assert(wikiWithDefaultStatus);
  // Validate both wikis have 'draft' status
  TestValidator.equals(
    "wiki with explicit draft status",
    wikiWithExplicitDraft.status,
    "draft",
  );
  TestValidator.equals(
    "wiki with default status",
    wikiWithDefaultStatus.status,
    "draft",
  );
}
