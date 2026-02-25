import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_content_flags_admin_search_multiple_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Search with multiple filters: status='pending' and date range
  const searchStart = new Date("2023-01-01T00:00:00Z").toISOString();
  const searchEnd = new Date().toISOString();
  const searchResult = await api.functional.discussionBoard.admin.flags.index(
    adminConnection,
    {
      body: {
        status: "pending",
        created_at_start: searchStart,
        created_at_end: searchEnd,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardContentFlag.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate that we received a response with data array
  TestValidator.predicate(
    "response has data array",
    Array.isArray(searchResult.data),
  );
  // Validate filtered results (if any exist)
  searchResult.data.forEach((flag) => {
    TestValidator.equals("flag status matches filter", flag.status, "pending");
    TestValidator.predicate(
      "flag creation date within range",
      flag.createdAt >= searchStart && flag.createdAt <= searchEnd,
    );
  });
  // Test with different status filter
  const resolvedSearchResult =
    await api.functional.discussionBoard.admin.flags.index(adminConnection, {
      body: {
        status: "resolved",
        created_at_start: searchStart,
        created_at_end: searchEnd,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardContentFlag.IRequest,
    });
  typia.assert(resolvedSearchResult);
  // Validate resolved flags
  resolvedSearchResult.data.forEach((flag) => {
    TestValidator.equals(
      "flag status matches resolved filter",
      flag.status,
      "resolved",
    );
    TestValidator.predicate(
      "flag creation date within range",
      flag.createdAt >= searchStart && flag.createdAt <= searchEnd,
    );
  });
}
