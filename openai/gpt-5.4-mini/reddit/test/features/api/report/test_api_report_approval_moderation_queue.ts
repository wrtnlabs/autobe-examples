import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_approval_moderation_queue(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(8)}@test.com`,
      password: `P@ssw0rd_${RandomGenerator.alphabets(8)}`,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: `member_${RandomGenerator.alphabets(8)}@test.com`,
      password: `P@ssw0rd_${RandomGenerator.alphabets(8)}`,
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const report = await generate_random_community_platform_member_reports_create(
    memberConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies DeepPartial<ICommunityPlatformReport.ICreate>,
    },
  );
  typia.assert(report);
  const queue = await api.functional.communityPlatform.admin.reports.index(
    adminConnection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformReport.IRequest,
    },
  );
  typia.assert(queue);
  TestValidator.predicate(
    "created report should be present in pending moderation queue",
    queue.data.some((item) => item.id === report.id),
  );
  const approved = await api.functional.communityPlatform.admin.reports.approve(
    adminConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(approved);
  TestValidator.equals("approved report id", approved.id, report.id);
  TestValidator.equals("approved report status", approved.status, "approved");
  const afterApprovalQueue =
    await api.functional.communityPlatform.admin.reports.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(afterApprovalQueue);
  TestValidator.predicate(
    "approved report should not remain in pending queue",
    !afterApprovalQueue.data.some((item) => item.id === report.id),
  );
  await TestValidator.error(
    "approving finalized report twice should fail",
    async () => {
      await api.functional.communityPlatform.admin.reports.approve(
        adminConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
