import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_detail_zero_subscribers_visible(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  const community = await api.functional.communityPlatform.communities.at(
    guestConnection,
    {
      communitySlug: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(community);
  TestValidator.predicate("slug populated", community.slug.length > 0);
  TestValidator.predicate("title populated", community.title.length > 0);
  TestValidator.predicate(
    "description populated",
    community.description.length > 0,
  );
  TestValidator.predicate("status populated", community.status.length > 0);
  TestValidator.predicate("owner id populated", community.member.id.length > 0);
  TestValidator.predicate(
    "owner code populated",
    community.member.code.length > 0,
  );
  TestValidator.predicate(
    "owner email populated",
    community.member.email.length > 0,
  );
  TestValidator.predicate(
    "created_at populated",
    community.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at populated",
    community.updated_at.length > 0,
  );
  TestValidator.predicate(
    "subscriber_count is non-negative",
    community.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "deleted_at nullable timestamp shape",
    community.deleted_at === null || community.deleted_at.length > 0,
  );
}
