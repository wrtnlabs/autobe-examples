import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_reddit_clone_guest_analytics_posts_top_error_handling(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: typia.random<IRedditCloneGuest.IJoin>(),
  });
  // Test invalid page number (less than 1)
  await TestValidator.error("invalid page number < 1", async () => {
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 0,
          limit: 10,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  });
  await TestValidator.error("invalid page number = 0", async () => {
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 0,
          limit: 10,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  });
  // Test invalid limit (exceeds maximum of 100)
  await TestValidator.error("invalid limit > 100", async () => {
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 101,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  });
  // Test invalid sorting algorithm
  await TestValidator.error("invalid sort algorithm", async () => {
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "invalid" as any,
          page: 1,
          limit: 10,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  });
  // Test missing required fields
  await TestValidator.error("missing sort field", async () => {
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies Partial<IRedditCloneContentPost.IRequest> as any,
      },
    );
  });
  await TestValidator.error("missing page field", async () => {
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          limit: 10,
        } satisfies Partial<IRedditCloneContentPost.IRequest> as any,
      },
    );
  });
  await TestValidator.error("missing limit field", async () => {
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 1,
        } satisfies Partial<IRedditCloneContentPost.IRequest> as any,
      },
    );
  });
  // Test invalid timeFilter for top sort
  await TestValidator.error("invalid timeFilter for top sort", async () => {
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 10,
          timeFilter: "invalid" as any,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  });
}
