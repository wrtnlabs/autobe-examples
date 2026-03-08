import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportSnapshot";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

/**
 * Test non-moderator member access denied for report snapshots.
 *
 * Validates that only community moderators can access report snapshot history.
 * A non-moderator member attempting to retrieve snapshots should receive a 403 Forbidden error.
 */
export async function test_api_report_snapshot_non_moderator_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner (becomes moderator automatically)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(ownerConnection, {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
          typia.random<string & tags.Format<"email">>()
        ),
        password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(
          RandomGenerator.alphaNumeric(16)
        ),
        username: typia.assert<string & tags.MinLength<1> & tags.MaxLength<50>>(
          RandomGenerator.name(1)
        ),
        href: typia.assert<string & tags.Format<"uri">>(
          typia.random<string & tags.Format<"uri">>()
        ),
        referrer: typia.assert<string & tags.Format<"uri">>(
          typia.random<string & tags.Format<"uri">>()
        ),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(ownerAuth);
  // 2. Create community (owner becomes moderator)
  const community: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create a text post in the community
  const post: IRedditPlatformPost =
    await generate_random_reddit_platform_member_posts_create(ownerConnection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    });
  typia.assert(post);
  // 4. Create reporter member and authenticate
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(reporterConnection, {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
          typia.random<string & tags.Format<"email">>()
        ),
        password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(
          RandomGenerator.alphaNumeric(16)
        ),
        username: typia.assert<string & tags.MinLength<1> & tags.MaxLength<50>>(
          RandomGenerator.name(1)
        ),
        href: typia.assert<string & tags.Format<"uri">>(
          typia.random<string & tags.Format<"uri">>()
        ),
        referrer: typia.assert<string & tags.Format<"uri">>(
          typia.random<string & tags.Format<"uri">>()
        ),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(reporterAuth);
  // 5. Subscribe reporter to the community (required to report posts)
  const reporterSubscription: IRedditPlatformCommunitySubscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      reporterConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(reporterSubscription);
  // 6. Submit a report on the post
  const report: IRedditPlatformReport =
    await generate_random_reddit_platform_member_reports_create(
      reporterConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          post_id: post.id,
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // 7. Create non-moderator member (not subscribed to community, not moderator)
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModeratorAuth: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(nonModeratorConnection, {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
          typia.random<string & tags.Format<"email">>()
        ),
        password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(
          RandomGenerator.alphaNumeric(16)
        ),
        username: typia.assert<string & tags.MinLength<1> & tags.MaxLength<50>>(
          RandomGenerator.name(1)
        ),
        href: typia.assert<string & tags.Format<"uri">>(
          typia.random<string & tags.Format<"uri">>()
        ),
        referrer: typia.assert<string & tags.Format<"uri">>(
          typia.random<string & tags.Format<"uri">>()
        ),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(nonModeratorAuth);
  // 8. Attempt to access report snapshots as non-moderator (should fail)
  await TestValidator.httpError(
    "non-moderator access to report snapshots denied",
    403,
    async () => {
      await api.functional.redditPlatform.member.reports.snapshots.index(
        nonModeratorConnection,
        {
          reportId: report.id,
          body: {} satisfies IRedditPlatformReportSnapshot.IRequest,
        },
      );
    },
  );
}