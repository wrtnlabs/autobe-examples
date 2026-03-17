import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_detail_public_discovery_view(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const communitySlug = typia.random<string & tags.Format<"uuid">>();
  const community = await api.functional.communityPlatform.communities.at(
    guestConnection,
    {
      communitySlug,
    },
  );
  typia.assert(community);
  TestValidator.equals(
    "slug matches requested community",
    community.slug,
    communitySlug,
  );
  TestValidator.predicate(
    "title is populated for discovery",
    community.title.length > 0,
  );
  TestValidator.predicate(
    "description is populated for discovery",
    community.description.length > 0,
  );
  TestValidator.predicate(
    "status is exposed for evaluation",
    community.status.length > 0,
  );
  TestValidator.predicate(
    "subscriber count is usable in discovery view",
    community.subscriber_count >= 0,
  );
}
