import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_report_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin123!",
      username: "admin_user",
      display_name: "Admin User",
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeAdmin.IJoin,
  });
  // 2. Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "Member123!",
      username: "member_user",
      display_name: "Member User",
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  // 3. Login as member to create post
  const memberLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: "member@test.com",
      password: "Member123!",
    } satisfies IRedditLikeMember.ILogin,
  });
  // 4. Create a post as member
  const post = await api.functional.redditLike.member.posts.create(
    memberLoginConnection,
    {
      body: {
        title: "Test post for report deletion",
        type: "text",
        content: "This is a test post that will be reported.",
        community_id: "00000000-0000-0000-0000-000000000000" satisfies string &
          tags.Format<"uuid">,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Login as different member to submit a report
  const reporterConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_member_login(reporterConnection, {
    body: {
      email: "member@test.com",
      password: "Member123!",
    } satisfies IRedditLikeMember.ILogin,
  });
  // 6. Create a report on the post
  const report = await api.functional.redditLike.member.reports.create(
    reporterConnection,
    {
      body: {
        reported_post_id: post.id satisfies string & tags.Format<"uuid">,
        reason: "This post contains inappropriate content.",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 7. Login as admin to delete the report
  const adminLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin123!",
    } satisfies IRedditLikeAdmin.ILogin,
  });
  // 8. Delete the report as admin
  await api.functional.redditLike.moderator.reports.erase(
    adminLoginConnection,
    {
      reportId: report.id satisfies string & tags.Format<"uuid">,
    },
  );
}
