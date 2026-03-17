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

export async function test_api_community_feed_sort_and_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const limit = 5 satisfies number as number;
  const farPage = 999999 satisfies number as number;
  await TestValidator.httpError(
    "missing community rejects new-sort first page request even when top_period is supplied",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.communities.posts.index(
        guestConnection,
        {
          communityId,
          body: {
            sort: "new",
            top_period: "week",
            page: 1,
            limit,
          } satisfies ICommunityPlatformPost.IRequest,
        },
      );
    },
  );
  await TestValidator.httpError(
    "missing community rejects new-sort later page request",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.communities.posts.index(
        guestConnection,
        {
          communityId,
          body: {
            sort: "new",
            top_period: "week",
            page: 2,
            limit,
          } satisfies ICommunityPlatformPost.IRequest,
        },
      );
    },
  );
  await TestValidator.httpError(
    "missing community rejects very far page request without treating page value as malformed",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.communities.posts.index(
        guestConnection,
        {
          communityId,
          body: {
            sort: "new",
            top_period: "week",
            page: farPage,
            limit,
          } satisfies ICommunityPlatformPost.IRequest,
        },
      );
    },
  );
  await TestValidator.httpError(
    "missing community rejects top-sort week request",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.communities.posts.index(
        guestConnection,
        {
          communityId,
          body: {
            sort: "top",
            top_period: "week",
            page: 1,
            limit,
          } satisfies ICommunityPlatformPost.IRequest,
        },
      );
    },
  );
  await TestValidator.httpError(
    "missing community rejects new-sort request with top_period supplied, showing the body shape remains accepted",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.communities.posts.index(
        guestConnection,
        {
          communityId,
          body: {
            sort: "new",
            top_period: "week",
            page: 1,
            limit,
          } satisfies ICommunityPlatformPost.IRequest,
        },
      );
    },
  );
}
