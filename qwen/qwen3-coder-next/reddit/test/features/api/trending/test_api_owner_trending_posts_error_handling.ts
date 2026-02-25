import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_trending_posts_error_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(3),
      displayName: "Test Owner",
    } satisfies IRedditCloneOwner.IJoin,
  });
  // 2. Test invalid sort algorithm
  await TestValidator.error("invalid sort algorithm", async () => {
    await api.functional.redditClone.owner.analytics.posts.trending(
      ownerConnection,
      {
        body: {
          sort: "invalid" as any,
          page: 1,
          limit: 10,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  });
  // 3. Test invalid pagination parameters
  await TestValidator.error("page too small", async () => {
    await api.functional.redditClone.owner.analytics.posts.trending(
      ownerConnection,
      {
        body: {
          sort: "hot",
          page: 0,
          limit: 10,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  });
  await TestValidator.error("limit too large", async () => {
    await api.functional.redditClone.owner.analytics.posts.trending(
      ownerConnection,
      {
        body: {
          sort: "hot",
          page: 1,
          limit: 101,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  });
  await TestValidator.error("limit too small", async () => {
    await api.functional.redditClone.owner.analytics.posts.trending(
      ownerConnection,
      {
        body: {
          sort: "hot",
          page: 1,
          limit: 0,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  });
  // 4. Test top sorting without time filter
  const output =
    await api.functional.redditClone.owner.analytics.posts.trending(
      ownerConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals("has pagination", output.pagination.current, 1);
  TestValidator.equals("has data array", Array.isArray(output.data), true);
}
