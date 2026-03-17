import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformReportApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportApproval";
import type { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import type { ICommunityPlatformReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComment";
import type { ICommunityPlatformReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_content_report } from "../../../prepare/prepare_random_community_platform_content_report";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_reports_grouped_moderator_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account (User A)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 2. Create Community A (moderator will be assigned)
  const communityA =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // 3. Create Community B (no moderator role)
  const communityB =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // 4. Create member account for reporter 1
  const reporter1Connection: api.IConnection = { host: connection.host };
  const reporter1Auth = await authorize_member_join(reporter1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(reporter1Auth);
  // 5. Create member account for reporter 2
  const reporter2Connection: api.IConnection = { host: connection.host };
  const reporter2Auth = await authorize_member_join(reporter2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(reporter2Auth);
  // 6. Create post in Community A
  const postA = await generate_random_community_platform_member_posts_create(
    reporter1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: communityA.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(postA);
  // 7. Create post in Community B
  const postB = await generate_random_community_platform_member_posts_create(
    reporter2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: communityB.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(postB);
  // 8. Create report in Community A
  const reportA =
    await generate_random_community_platform_member_reports_create(
      reporter1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          postId: postA.id,
        } satisfies ICommunityPlatformContentReport.ICreate,
      },
    );
  typia.assert(reportA);
  // 9. Create report in Community B
  const reportB =
    await generate_random_community_platform_member_reports_create(
      reporter2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          postId: postB.id,
        } satisfies ICommunityPlatformContentReport.ICreate,
      },
    );
  typia.assert(reportB);
  // 10. Verify moderator cannot see reports before being assigned role
  const groupedBeforeRole =
    await api.functional.communityPlatform.member.reports.grouped.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformContentReport.IGroupedRequest,
      },
    );
  typia.assert(groupedBeforeRole);
  TestValidator.equals(
    "moderator sees no reports before role assignment",
    groupedBeforeRole.data.length,
    0,
  );
  // 11. Assign moderator role to Community A
  await generate_random_community_platform_member_moderation_roles_create(
    moderatorConnection,
    {
      body: {
        memberId: moderatorAuth.id,
        roleType: "moderator",
      } satisfies ICommunityPlatformModerationRole.ICreate,
      params: {
        communityId: communityA.id,
      },
    },
  );
  // 12. Verify moderator can now see reports from Community A only
  const groupedAfterRole =
    await api.functional.communityPlatform.member.reports.grouped.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformContentReport.IGroupedRequest,
      },
    );
  typia.assert(groupedAfterRole);
  // 13. Verify reports are only from Community A
  TestValidator.equals(
    "moderator sees reports only from assigned community",
    groupedAfterRole.data.length,
    1,
  );
  TestValidator.equals(
    "report belongs to Community A",
    groupedAfterRole.data[0].community.id,
    communityA.id,
  );
  TestValidator.equals(
    "total reports for Community A content",
    groupedAfterRole.data[0].total_reports,
    1,
  );
  TestValidator.equals(
    "report content matches Community A post",
    groupedAfterRole.data[0].content_id,
    postA.id,
  );
  // 14. Verify non-moderator member cannot access grouped reports endpoint
  await TestValidator.error(
    "non-moderator cannot access grouped reports",
    async () => {
      await api.functional.communityPlatform.member.reports.grouped.index(
        reporter1Connection,
        {
          body: {
            status: "pending",
            limit: 10,
            page: 1,
          } satisfies ICommunityPlatformContentReport.IGroupedRequest,
        },
      );
    },
  );
}
