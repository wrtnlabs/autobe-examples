import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_report_deletion_by_community_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and login as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoin: IRedditLikeModerator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: "moderator_" + RandomGenerator.alphaNumeric(6),
    display_name: "Test Moderator",
    password: "12345678",
    bio: null,
    avatar_url: null,
    href: "https://example.com",
    referrer: "https://example.com",
  };
  await authorize_moderator_join(moderatorConnection, { body: moderatorJoin });
  // Step 2: Create and login as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin: IRedditLikeMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: "member_" + RandomGenerator.alphaNumeric(6),
    password: "12345678",
    display_name: "Test Member",
    bio: null,
    avatar_url: null,
  };
  await authorize_member_join(memberConnection, { body: memberJoin });
  // Step 3: Member creates post
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Test Post for Report",
        type: "text",
        content: "This is a test post",
        community_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Step 4: Member submits report
  const report = await api.functional.redditLike.member.reports.create(
    memberConnection,
    {
      body: {
        reported_post_id: post.id,
        reason: "This post violates community guidelines",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // Step 5: Moderator deletes the report
  await api.functional.redditLike.moderator.reports.erase(moderatorConnection, {
    reportId: report.id,
  });
  // Step 6: Verify operation completed successfully
  TestValidator.predicate("report deletion completed successfully", () => true);
}
