import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_detail_slug_not_found(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = {
    ...connection,
  };
  const communitySlug = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent community slug returns not-found for detail lookup",
    404,
    async () => {
      await api.functional.communityPlatform.communities.at(guestConnection, {
        communitySlug,
      });
    },
  );
}
