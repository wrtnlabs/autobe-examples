import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test that a regular member (non-moderator) cannot view report details.
 *
 * This test validates the security requirement that only community moderators
 * can access report details, ensuring moderation processes remain confidential
 * and restricted to authorized personnel.
 */
export async function test_api_report_view_non_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner (will be moderator)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a post in a community (need community first - using utility handles this)
  const post = await generate_random_reddit_clone_member_posts_create(
    ownerConnection,
    {},
  );
  typia.assert(post);
  // 3. Create reporter member account (non-moderator)
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {});
  // 4. Reporter submits a report on the post
  const report = await generate_random_reddit_clone_member_reports_create(
    reporterConnection,
    {
      body: {
        content_type: "post",
        post_id: post.id,
        reason: "This content violates community guidelines",
      },
    },
  );
  typia.assert(report);
  // 5. Create a separate regular member (non-moderator, not the reporter)
  const regularMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(regularMemberConnection, {});
  // 6. Attempt to view the report as a non-moderator
  // This should fail with 403 Forbidden
  await TestValidator.error(
    "non-moderator cannot view report details",
    async () => {
      await api.functional.redditClone.member.reports.at(
        regularMemberConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
