import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleView";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleView";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_citizen_activity_metrics_access(
  connection: api.IConnection,
): Promise<void> {
  // Create citizen user for authorization
  const citizenConnection: api.IConnection = { host: connection.host };
  const authorizedCitizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(authorizedCitizen);
  // Use the authorized connection for the activity metrics endpoint
  const activityMetrics =
    await api.functional.economicBoard.citizen.reports.activity.index(
      citizenConnection,
    );
  typia.assert(activityMetrics);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is at least 1",
    activityMetrics.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    activityMetrics.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    activityMetrics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    activityMetrics.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate(
    "data array exists",
    Array.isArray(activityMetrics.data),
  );
  TestValidator.predicate(
    "data array length matches pagination",
    activityMetrics.data.length <= activityMetrics.pagination.limit,
  );
  // Validate each activity view entry
  for (const entry of activityMetrics.data) {
    TestValidator.equals("entry has valid uuid id", typeof entry.id, "string");
    TestValidator.predicate(
      "id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(entry.id),
    );
    TestValidator.equals(
      "entry has valid uuid article_id",
      typeof entry.article_id,
      "string",
    );
    TestValidator.predicate(
      "article_id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(entry.article_id),
    );
    TestValidator.equals(
      "entry has valid uuid user_id",
      typeof entry.user_id,
      "string",
    );
    TestValidator.predicate(
      "user_id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(entry.user_id),
    );
    TestValidator.equals(
      "entry has valid user_type",
      entry.user_type,
      "citizen" as const,
    );
    TestValidator.equals(
      "entry has valid date-time created_at",
      typeof entry.created_at,
      "string",
    );
    TestValidator.predicate(
      "created_at matches ISO 8601 date-time format",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(?:Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
        entry.created_at,
      ),
    );
    // Verify this is within the past 30 days
    const entryDate = new Date(entry.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    TestValidator.predicate(
      "created_at is within past 30 days",
      entryDate >= thirtyDaysAgo,
    );
  }
}
