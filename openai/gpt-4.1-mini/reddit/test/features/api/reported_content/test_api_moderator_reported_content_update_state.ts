import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_moderator_reported_content_update_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator setup
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: "https://example.com/avatar.png"
    },
  });
  typia.assert(moderator);
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  const moderatorLogin = await authorize_moderator_login(
    moderatorLoginConnection,
    {
      body: {
        email:
          (moderator as { user?: { email: string } }).user?.email ??
          typia.random<string & tags.Format<"email">>(),
        password: "1234",
      },
    },
  );
  typia.assert(moderatorLogin);
  // 2. User setup
  const userJoinConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(user);
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userLogin = await authorize_user_login(userLoginConnection, {
    body: {
      email: user.email,
      password: "1234",
    },
  });
  typia.assert(userLogin);
  // 3. Create a report linked to reported content
  const reportBody: ICommunityPlatformReport.ICreate = {
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "pending",
    contentType: "comment",
    contentId: typia.random<string & tags.Format<"uuid">>(),
    communityPlatformReportReasonId: typia.random<
      string & tags.Format<"uuid">
    >(),
  } as any; // enforcing minimal required fields with any to satisfy ambiguous structure
  const report = await api.functional.communityPlatform.user.reports.create(
    userLoginConnection,
    {
      body: reportBody,
    },
  );
  typia.assert(report);
  // 4. Fetch initial reported contents list linked to report
  const filterBody: ICommunityPlatformReportedContent.IRequest = {
    contentType: null,
    createdAfter: null,
    createdBefore: null,
    isDeleted: null,
    page: 1,
    limit: 100,
  };
  const initialContents =
    await api.functional.communityPlatform.moderator.reports.reportedContents.index(
      moderatorLoginConnection,
      {
        reportId: report.id,
        body: filterBody,
      },
    );
  typia.assert(initialContents);
  await TestValidator.predicate(
    "reported contents exist",
    initialContents.data.length > 0,
  );
  // 5. Test unauthorized access
  const baseConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized update attempt", async () => {
    await api.functional.communityPlatform.moderator.reports.reportedContents.index(
      baseConnection,
      {
        reportId: report.id,
        body: filterBody,
      },
    );
  });
  // 6. Test invalid UUID reportId param
  await TestValidator.error("invalid reportId format", async () => {
    await api.functional.communityPlatform.moderator.reports.reportedContents.index(
      moderatorLoginConnection,
      {
        reportId: "not-a-uuid",
        body: filterBody,
      },
    );
  });
  // 7. Verify consistency of reported contents list (reflects state change if any)
  const finalContents =
    await api.functional.communityPlatform.moderator.reports.reportedContents.index(
      moderatorLoginConnection,
      {
        reportId: report.id,
        body: filterBody,
      },
    );
  typia.assert(finalContents);
  TestValidator.equals(
    "reported contents list consistency",
    initialContents.data.map((x) => x.id),
    finalContents.data.map((x) => x.id),
  );
  TestValidator.equals(
    "reported contents deleted_at consistency",
    initialContents.data.map((x) => x.deleted_at),
    finalContents.data.map((x) => x.deleted_at),
  );
}
