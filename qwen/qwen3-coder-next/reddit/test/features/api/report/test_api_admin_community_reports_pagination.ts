import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_reports_create } from "../../../generate/generate_random_reddit_like_member_posts_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_admin_community_reports_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join to get initial admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  // 2. Member join to create reporting users
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 3. Create community as admin
  const community = await generate_random_reddit_like_member_communities_create(
    adminConnection,
    {
      body: {
        name: "test-community-" + RandomGenerator.alphabets(6),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  // 4. Member logs in to create posts
  const loginMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(loginMemberConnection, {
    body: {
      email: "test@example.com" satisfies string & tags.Format<"email">,
      password: "password",
    } satisfies IRedditLikeMember.ILogin,
  });
  // 5. Create 25 posts (5 per community for pagination testing)
  const posts: IRedditLikePost[] = await Promise.all(
    ArrayUtil.repeat(25, () =>
      generate_random_reddit_like_member_posts_create(loginMemberConnection, {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          type: RandomGenerator.pick(["text", "link", "image"] as const),
          content:
            RandomGenerator.pick(["text", "link", "image"] as const) === "text"
              ? RandomGenerator.content({ paragraphs: 2 })
              : undefined,
          url:
            RandomGenerator.pick(["text", "link", "image"] as const) === "link"
              ? (RandomGenerator.pick([
                  "https://example.com",
                  "https://test.com",
                ]) as any)
              : undefined,
          image_url:
            RandomGenerator.pick(["text", "link", "image"] as const) === "image"
              ? (RandomGenerator.pick([
                  "https://example.com/image.jpg",
                  "https://test.com/image.png",
                ]) as any)
              : undefined,
        } satisfies IRedditLikePost.ICreate,
      }),
    ),
  );
  // 6. Submit multiple reports to reach pagination threshold (25 reports total)
  for (let i = 0; i < 25; i++) {
    await generate_random_reddit_like_member_posts_reports_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditLikeReport.ICreate,
        params: { postId: posts[i].id },
      },
    );
  }
  // 7. Re-authenticate as admin to retrieve reports
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection2, {
    body: {
      email: "admin@example.com" satisfies string & tags.Format<"email">,
      password: "password",
    } satisfies IRedditLikeAdmin.ILogin,
  });
  // 8. Admin requests reports with pagination (limit=10, page=2)
  const reportsPage2 =
    await api.functional.redditLike.admin.communities.reports.index(
      adminConnection2,
      {
        communityId: community.id,
        body: {
          limit: 10,
          page: 2,
          sort: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(reportsPage2);
  // 9. Validate pagination results
  TestValidator.equals("current page is 2", reportsPage2.pagination.current, 2);
  TestValidator.equals("limit is 10", reportsPage2.pagination.limit, 10);
  TestValidator.equals(
    "total records is 25",
    reportsPage2.pagination.records,
    25,
  );
  TestValidator.equals("total pages is 3", reportsPage2.pagination.pages, 3);
  TestValidator.equals("data array length is 10", reportsPage2.data.length, 10);
  // 10. Validate data items
  reportsPage2.data.forEach((report, index) => {
    TestValidator.predicate("report has valid ID", () => Boolean(report.id));
    TestValidator.predicate("report has reporter", () =>
      Boolean(report.reporter),
    );
    TestValidator.predicate("report has status", () =>
      ["pending", "approved", "dismissed"].includes(report.status),
    );
  });
}