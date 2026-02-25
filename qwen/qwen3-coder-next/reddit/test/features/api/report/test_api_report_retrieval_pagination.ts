import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentReport";
import type { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_report_retrieval_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 2: Retrieve first page with limit 20
  const firstPage =
    await api.functional.redditClone.moderator.communities.reports.index(
      moderatorConnection,
      {
        communityId: "test-community-id",
        body: {
          limit: 20,
          page: 1,
        } satisfies IRedditCloneContentReport.IRequest,
      },
    );
  typia.assert(firstPage);
  // Step 3: Verify pagination structure
  TestValidator.equals("first page has data", firstPage.data.length > 0, true);
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", firstPage.pagination.limit, 20);
  // Step 4: Retrieve second page with limit 20, page 2
  const secondPage =
    await api.functional.redditClone.moderator.communities.reports.index(
      moderatorConnection,
      {
        communityId: "test-community-id",
        body: {
          limit: 20,
          page: 2,
        } satisfies IRedditCloneContentReport.IRequest,
      },
    );
  typia.assert(secondPage);
  // Step 5: Verify pagination shows correct values
  TestValidator.equals(
    "pagination current page second",
    secondPage.pagination.current,
    2,
  );
  // Step 6: Test that reports are sorted by created_at descending
  const allReports = [...firstPage.data, ...secondPage.data];
  // Verify descending order of created_at
  for (let i = 0; i < allReports.length - 1; i++) {
    const currentCreatedAt = new Date(allReports[i].created_at).getTime();
    const nextCreatedAt = new Date(allReports[i + 1].created_at).getTime();
    TestValidator.predicate(
      `report ${i} is newer than ${i + 1}`,
      currentCreatedAt >= nextCreatedAt,
    );
  }
}
