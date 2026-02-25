import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
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

export async function test_api_user_reports_listing_with_filters_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator setup: join and login moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: "https://example.com/avatar.png",
  };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: moderatorJoinInput,
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 2. Create user actor who will submit reports
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPass123!",
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com",
  };
  const userAuth = await authorize_user_join(userConnection, {
    body: userJoinInput,
  });
  typia.assert(userAuth);
  userConnection.headers = { Authorization: userAuth.token.access };
  // 3. Prepare valid filters
  const filters: ICommunityPlatformReport.IRequest = {
    contentType: RandomGenerator.pick(["post", "comment"] as const),
    status: RandomGenerator.pick(["pending", "approved", "dismissed"] as const),
    communityPlatformUserId: userAuth.id,
    page: 1,
    limit: 10,
    createdAtStart: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 7,
    ).toISOString(), // 7 days ago
    createdAtEnd: new Date().toISOString(),
    communityPlatformCommunityId: undefined, // we assume no specific community filter
  };
  // 4. Retrieve report list as moderator
  const reportsPage = await api.functional.communityPlatform.user.reports.index(
    moderatorConnection,
    {
      body: filters,
    },
  );
  typia.assert(reportsPage);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page >= 1",
    reportsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination total pages >= 0",
    reportsPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination total records >= 0",
    reportsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    reportsPage.pagination.limit > 0,
  );
  // 6. Validate each report in list
  for (const report of reportsPage.data) {
    typia.assert(report);
    TestValidator.predicate(
      "report status is valid",
      ["pending", "approved", "dismissed"].includes(report.status),
    );
    TestValidator.predicate(
      "report user id matches filter or any",
      !filters.communityPlatformUserId ||
        report.user.id === filters.communityPlatformUserId,
    );
    TestValidator.predicate(
      "report created_at within range",
      new Date(report.created_at) >=
        new Date(filters.createdAtStart ?? "1970-01-01T00:00:00Z") &&
        new Date(report.created_at) <=
          new Date(filters.createdAtEnd ?? new Date().toISOString()),
    );
  }
  // 7. Unauthorized access test: try to call without auth
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized user cannot access reports",
    async () => {
      await api.functional.communityPlatform.user.reports.index(
        anonymousConnection,
        {
          body: filters,
        },
      );
    },
  );
}
