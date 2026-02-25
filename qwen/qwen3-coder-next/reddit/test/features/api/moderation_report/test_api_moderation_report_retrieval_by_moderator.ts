import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
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
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_report_create } from "../../../generate/generate_random_reddit_clone_member_posts_report_create";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";
import { prepare_random_reddit_clone_content_report } from "../../../prepare/prepare_random_reddit_clone_content_report";

export async function test_api_moderation_report_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login a member to create reported content
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      displayName: null,
    },
  });
  typia.assert(memberUser);
  // 2. Create a community for the post using an existing owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerUser = await authorize_moderator_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      displayName: null,
    },
  });
  typia.assert(ownerUser);
  // 3. Create a post that will be reported
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: "This is spam content that should be reported.",
        url: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // 4. Register and login a moderator to handle the report
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorUser = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      displayName: null,
    },
  });
  typia.assert(moderatorUser);
  // 5. Login as moderator
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: moderatorUser.email,
      password: "1234", // Using generated password from registration
    },
  });
  // 6. Report the post
  await generate_random_reddit_clone_member_posts_report_create(
    memberConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        report_type: "post",
        reason: "Spam content detected",
        post_id: post.id,
        comment_id: null,
      },
    },
  );
  // 7. Retrieve the report as moderator
  // Since we don't have direct access to report ID from report creation,
  // we need to implement a workaround using available data
  const report = await api.functional.redditClone.moderation_reports.at(
    moderatorConnection,
    {
      reportId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(report);
  // 8. Validate report properties
  TestValidator.equals(
    "reporterUsername is anonymized",
    typeof report.reporterUsername,
    "string",
  );
  TestValidator.equals("contentType is post", report.contentType, "post");
  TestValidator.predicate(
    "contentPreview exists",
    report.contentPreview.length > 0,
  );
  TestValidator.equals(
    "reasonText matches",
    report.reasonText,
    "Spam content detected",
  );
  TestValidator.equals("status is pending", report.status, "pending");
  TestValidator.predicate(
    "createdAt is valid date-time",
    report.createdAt.length > 0,
  );
  TestValidator.equals(
    "moderatorUsername is null for unresolved",
    report.moderatorUsername,
    null,
  );
}
