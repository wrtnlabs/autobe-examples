import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_queue_list_by_community(
  connection: api.IConnection,
): Promise<void> {
  const targetMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      username: `member_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/avatar/${RandomGenerator.alphabets(6)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const otherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      username: `member_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/avatar/${RandomGenerator.alphabets(6)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const targetCommunity =
    await generate_random_community_platform_member_communities_create(
      targetMemberConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: `https://example.com/icon/${RandomGenerator.alphabets(6)}.png`,
        },
      },
    );
  const otherCommunity =
    await generate_random_community_platform_member_communities_create(
      otherMemberConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: `https://example.com/icon/${RandomGenerator.alphabets(6)}.png`,
        },
      },
    );
  const targetPost =
    await generate_random_community_platform_member_posts_create(
      targetMemberConnection,
      {
        body: {
          community_id: targetCommunity.id,
          title: `Target post ${RandomGenerator.alphabets(6)}`,
          contentType: "text",
          text: { body: true },
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  const otherPost =
    await generate_random_community_platform_member_posts_create(
      otherMemberConnection,
      {
        body: {
          community_id: otherCommunity.id,
          title: `Other post ${RandomGenerator.alphabets(6)}`,
          contentType: "text",
          text: { body: true },
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  const targetReport1 =
    await generate_random_community_platform_member_reports_create(
      targetMemberConnection,
      {
        body: {
          targetType: "post",
          targetId: targetPost.id,
          reason: `spam ${RandomGenerator.alphabets(8)}`,
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  const targetReport2 =
    await generate_random_community_platform_member_reports_create(
      otherMemberConnection,
      {
        body: {
          targetType: "post",
          targetId: targetPost.id,
          reason: `abuse ${RandomGenerator.alphabets(8)}`,
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  const otherReport =
    await generate_random_community_platform_member_reports_create(
      otherMemberConnection,
      {
        body: {
          targetType: "post",
          targetId: otherPost.id,
          reason: `off-topic ${RandomGenerator.alphabets(8)}`,
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(targetReport1);
  typia.assert(targetReport2);
  typia.assert(otherReport);
  const page = await api.functional.communityPlatform.admin.reports.index(
    adminConnection,
    {
      body: {
        communityId: targetCommunity.id,
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformReport.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals("requested page number", page.pagination.current, 1);
  TestValidator.predicate(
    "pagination metadata is valid",
    page.pagination.limit >= 1 &&
      page.pagination.pages >= 0 &&
      page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "target community reports are returned",
    page.data.length >= 2,
  );
  TestValidator.predicate(
    "multiple reports for the same target remain separate entries",
    page.data.filter((report) => report.targetId === targetPost.id).length >= 2,
  );
  TestValidator.predicate(
    "reports are limited to the requested target type and the created target report reason set",
    page.data.every(
      (report) =>
        report.targetType === "post" &&
        (report.targetId === targetPost.id ||
          report.targetId === otherPost.id) &&
        (report.reason === targetReport1.reason ||
          report.reason === targetReport2.reason ||
          report.reason === otherReport.reason),
    ),
  );
  TestValidator.predicate(
    "returned reports contain moderation review fields",
    page.data.every(
      (report) =>
        typeof report.id === "string" &&
        typeof report.member === "object" &&
        typeof report.community === "object" &&
        typeof report.targetType === "string" &&
        typeof report.targetId === "string" &&
        typeof report.reason === "string" &&
        typeof report.status === "string" &&
        report.reviewedAt === null &&
        typeof report.createdAt === "string" &&
        typeof report.updatedAt === "string" &&
        report.deletedAt === null,
    ),
  );
}
