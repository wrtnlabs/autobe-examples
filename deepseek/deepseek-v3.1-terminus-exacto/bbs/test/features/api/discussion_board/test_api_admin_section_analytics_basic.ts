import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_section_analytics_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using join operation
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
  // Call analytics endpoint with minimal pagination parameters
  const response =
    await api.functional.discussionBoard.admin.analytics.sections.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  // Validate response structure
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination structure",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate("has current page", response.pagination.current >= 0);
  TestValidator.predicate("has limit", response.pagination.limit >= 0);
  TestValidator.predicate(
    "has records count",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("has pages count", response.pagination.pages >= 0);
  // Validate data array structure
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // Validate each statistic item if data exists
  if (response.data.length > 0) {
    const item = response.data[0];
    TestValidator.equals("has id field", typeof item.id, "string");
    TestValidator.equals(
      "has view_count field",
      typeof item.view_count,
      "number",
    );
    TestValidator.equals(
      "has article_count field",
      typeof item.article_count,
      "number",
    );
    TestValidator.equals(
      "has comment_count field",
      typeof item.comment_count,
      "number",
    );
    TestValidator.equals(
      "has last_activity_at field",
      typeof item.last_activity_at,
      "string",
    );
    // Validate section object
    TestValidator.equals("has section object", typeof item.section, "object");
    TestValidator.equals("section has id", typeof item.section.id, "string");
    TestValidator.equals(
      "section has name",
      typeof item.section.name,
      "string",
    );
    TestValidator.equals(
      "section has description",
      typeof item.section.description,
      "string",
    );
    TestValidator.equals(
      "section has status",
      typeof item.section.status,
      "string",
    );
    TestValidator.equals(
      "section has display_order",
      typeof item.section.display_order,
      "number",
    );
  }
}
