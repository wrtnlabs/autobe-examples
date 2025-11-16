import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

export async function test_api_moderation_report_queue_pagination_limit_control(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a moderator
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test limit value of 1
  const resultLimit1: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        limit: 1,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(resultLimit1);
  TestValidator.predicate(
    "limit 1 result count respects limit",
    resultLimit1.data.length <= 1,
  );
  TestValidator.equals(
    "limit 1 pagination limit metadata",
    resultLimit1.pagination.limit,
    1,
  );

  // Step 3: Test limit value of 10
  const resultLimit10: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        limit: 10,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(resultLimit10);
  TestValidator.predicate(
    "limit 10 result count respects limit",
    resultLimit10.data.length <= 10,
  );
  TestValidator.equals(
    "limit 10 pagination limit metadata",
    resultLimit10.pagination.limit,
    10,
  );

  // Step 4: Test limit value of 50
  const resultLimit50: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        limit: 50,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(resultLimit50);
  TestValidator.predicate(
    "limit 50 result count respects limit",
    resultLimit50.data.length <= 50,
  );
  TestValidator.equals(
    "limit 50 pagination limit metadata",
    resultLimit50.pagination.limit,
    50,
  );

  // Step 5: Test limit value of 100 (maximum allowed)
  const resultLimit100: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        limit: 100,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(resultLimit100);
  TestValidator.predicate(
    "limit 100 result count respects limit",
    resultLimit100.data.length <= 100,
  );
  TestValidator.equals(
    "limit 100 pagination limit metadata",
    resultLimit100.pagination.limit,
    100,
  );

  // Step 6: Test limit value exceeding maximum (should be rejected)
  await TestValidator.error(
    "limit exceeding maximum should be rejected",
    async () => {
      await api.functional.communityPlatform.moderator.reports.index(
        connection,
        {
          body: {
            limit: 101,
          } satisfies ICommunityPlatformReport.IRequest,
        },
      );
    },
  );
}
