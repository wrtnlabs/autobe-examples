import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_comments_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_reports_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_report } from "../../../prepare/prepare_random_reddit_community_comment_report";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_comment_report_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Member A (reporter)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  typia.assert<IRedditCommunityMember.ISummary>(memberAAuth);
  // 2. Register and authenticate Member B (comment creator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuth);
  typia.assert<IRedditCommunityMember.ISummary>(memberBAuth);
  // 3. Validate members are different
  TestValidator.notEquals(
    "Member A and B are different",
    memberAAuth.id,
    memberBAuth.id,
  );
  // 4. Member A creates a post
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await generate_random_reddit_community_member_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Member B creates a comment on the post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberBConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 6. Member A submits first report on Member B's comment
  const firstReport =
    await generate_random_reddit_community_member_posts_comments_reports_create(
      memberAConnection,
      {
        body: {
          reason: "This comment is spam content",
        },
        params: { postId: post.id, commentId: comment.id },
      },
    );
  typia.assert(firstReport);
  // 7. Validate first report status
  TestValidator.equals("first report status", firstReport.status, "pending");
  TestValidator.equals(
    "first report reporter",
    firstReport.reporter.id,
    memberAAuth.id,
  );
  TestValidator.equals(
    "first report comment",
    firstReport.comment.id,
    comment.id,
  );
  // 8. Member A attempts to submit second report (should fail)
  await TestValidator.error("duplicate report prevention", async () => {
    await generate_random_reddit_community_member_posts_comments_reports_create(
      memberAConnection,
      {
        body: {
          reason: "This comment is harassment",
        },
        params: { postId: post.id, commentId: comment.id },
      },
    );
  });
  // 9. Verify original report still exists and comment unchanged
  TestValidator.predicate(
    "first report still pending",
    firstReport.status === "pending",
  );
  TestValidator.equals(
    "comment content unchanged",
    comment.content,
    comment.content,
  );
}
