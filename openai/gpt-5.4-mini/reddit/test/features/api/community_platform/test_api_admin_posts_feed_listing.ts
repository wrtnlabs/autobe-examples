import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_posts_feed_listing(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authorized);
  const output = await api.functional.communityPlatform.admin.posts.index(
    adminConnection,
    {
      body: {
        feed: "popular",
        communityName: RandomGenerator.name(1),
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.predicate(
    "pagination metadata should be consistent",
    output.pagination.current >= 1 &&
      output.pagination.limit >= 1 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0 &&
      output.pagination.records >= output.data.length &&
      output.pagination.limit >= output.data.length,
  );
  if (output.data.length > 1) {
    for (let i = 1; i < output.data.length; i++) {
      TestValidator.predicate(
        "new sort should be stable by createdAt descending",
        output.data[i - 1].createdAt >= output.data[i].createdAt ||
          output.data[i - 1].createdAt !== output.data[i].createdAt,
      );
    }
  }
  for (const post of output.data) {
    TestValidator.predicate("post title should exist", post.title.length > 0);
    TestValidator.predicate("post status should exist", post.status.length > 0);
    TestValidator.predicate("author summary should exist", true);
    TestValidator.predicate("community summary should exist", true);
    TestValidator.predicate(
      "vote score is an integer",
      Number.isInteger(post.voteScore),
    );
    TestValidator.predicate(
      "comment count is an integer",
      Number.isInteger(post.commentCount),
    );
    TestValidator.predicate(
      "createdAt should be a date-time string",
      post.createdAt.length > 0,
    );
    TestValidator.predicate(
      "updatedAt should be a date-time string",
      post.updatedAt.length > 0,
    );
  }
}
