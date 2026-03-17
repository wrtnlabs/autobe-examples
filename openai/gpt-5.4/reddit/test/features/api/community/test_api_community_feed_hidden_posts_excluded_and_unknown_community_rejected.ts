import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_feed_hidden_posts_excluded_and_unknown_community_rejected(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = {
    host: connection.host,
  };
  const body = {
    page: 1,
    limit: 10,
    sort: "new",
  } satisfies ICommunityPlatformPost.IRequest;
  await TestValidator.httpError(
    "unknown community feed request is rejected",
    [403, 404, 410, 422],
    async () => {
      await api.functional.communityPlatform.communities.posts.index(
        guestConnection,
        {
          communityId: typia.random<string & tags.Format<"uuid">>(),
          body,
        },
      );
    },
  );
}
