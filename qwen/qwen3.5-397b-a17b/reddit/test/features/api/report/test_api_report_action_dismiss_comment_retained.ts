import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReportAction";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_communities_reports_actions_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_actions_create";
import { generate_random_reddit_clone_member_communities_reports_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";
import { prepare_random_reddit_clone_report_action } from "../../../prepare/prepare_random_reddit_clone_report_action";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_report_action_dismiss_comment_retained(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community - owner becomes moderator
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(owner);
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 2. Authenticate as post author
  const postAuthorConnection: api.IConnection = { host: connection.host };
  const postAuthor = await authorize_member_join(postAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(postAuthor);
  // 3. Subscribe post author to community
  await generate_random_reddit_clone_member_subscriptions_create(
    postAuthorConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditCloneSubscription.ICreate,
    },
  );
  // 4. Create a text post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    postAuthorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditClonePostText.ICreate,
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Authenticate as commenter
  const commenterConnection: api.IConnection = { host: connection.host };
  const commenter = await authorize_member_join(commenterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(commenter);
  // 6. Subscribe commenter to community
  await generate_random_reddit_clone_member_subscriptions_create(
    commenterConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditCloneSubscription.ICreate,
    },
  );
  // 7. Commenter creates a comment on the post - store body for later validation
  const commentBody = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      commenterConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: commentBody,
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(comment);
  // 8. Authenticate as reporter
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(reporter);
  // 9. Subscribe reporter to community
  await generate_random_reddit_clone_member_subscriptions_create(
    reporterConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditCloneSubscription.ICreate,
    },
  );
  // 10. Reporter submits a report on the comment
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      reporterConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          target_type: "COMMENT",
          target_id: comment.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCloneReport.ICreate,
      },
    );
  typia.assert(report);
  // Verify initial report status is PENDING
  TestValidator.equals(
    "report initial status",
    report.review_status,
    "PENDING",
  );
  // 11. Moderator (owner) dismisses the report
  const action =
    await api.functional.redditClone.member.communities.reports.actions.create(
      ownerConnection,
      {
        communityId: community.id,
        reportId: report.id,
        body: {
          action: "DISMISS",
        } satisfies IRedditCloneReportAction.ICreate,
      },
    );
  typia.assert(action);
  // Validate action record
  TestValidator.equals("action type", action.action, "DISMISS");
  TestValidator.equals("action report id", action.report.id, report.id);
  TestValidator.equals(
    "action report target type",
    action.report.target_type,
    "COMMENT",
  );
  TestValidator.predicate(
    "action has moderator",
    action.moderator !== undefined,
  );
  TestValidator.equals("moderator is owner", action.moderator.is_owner, true);
  // Validate report status changed to DISMISSED
  TestValidator.equals(
    "report status after dismiss",
    action.report.review_status,
    "DISMISSED",
  );
  // Verify comment remains visible - body preserved
  TestValidator.equals("comment body preserved", comment.body, commentBody);
  // Verify comment was not soft-deleted (deleted_at is null)
  TestValidator.predicate("comment not deleted", comment.deleted_at === null);
}
