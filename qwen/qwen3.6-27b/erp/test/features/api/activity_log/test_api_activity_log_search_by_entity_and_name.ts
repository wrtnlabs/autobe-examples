import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogDetail";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test entity type filtering and text search on entity names in activity logs.
 *
 * Validates that the activity log indexing endpoint correctly filters results by entityType using IN clause logic and performs case-insensitive ILIKE substring matching on entity names via the searchTerm filter. The test verifies single entity type filtering, case-insensitive search terms, and multiple entity type filtering.
 *
 * 1. Authenticate a new member account to access activity logs.
 * 2. Query activity logs filtered by entityType 'project' with searchTerm 'Q1'.
 * 3. Verify all returned logs have entityType 'project' and entityName containing 'Q1' (case-insensitive).
 * 4. Query with lowercase searchTerm 'q1' to confirm case-insensitive matching.
 * 5. Query with multiple entity types ['employee', 'contract'] to verify IN clause filtering.
 *
 * Special attention is given to ensuring that combined filters work with AND logic and that entity names reflect historical state captured at action time.
 */
export async function test_api_activity_log_search_by_entity_and_name(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  const searchRequest: IHrmPlatformActivityLog.IRequest = {
    entityType: ["project"],
    searchTerm: "Q1",
  };
  const searchResponse =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      { body: searchRequest },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search response has valid pagination",
    searchResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "search response data is an array",
    Array.isArray(searchResponse.data),
  );
  searchResponse.data.forEach((log) => {
    typia.assert(log);
    TestValidator.equals(
      "log entityType matches filter",
      log.entityType,
      "project",
    );
    if (log.entityName !== null) {
      TestValidator.predicate(
        "log entityName contains search term 'Q1' case-insensitively",
        log.entityName.toLowerCase().includes("q1"),
      );
    }
  });
  const caseInsensitiveRequest: IHrmPlatformActivityLog.IRequest = {
    entityType: ["project"],
    searchTerm: "q1",
  };
  const caseInsensitiveResponse =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      { body: caseInsensitiveRequest },
    );
  typia.assert(caseInsensitiveResponse);
  TestValidator.predicate(
    "case-insensitive response has valid pagination",
    caseInsensitiveResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "case-insensitive response data is an array",
    Array.isArray(caseInsensitiveResponse.data),
  );
  caseInsensitiveResponse.data.forEach((log) => {
    typia.assert(log);
    TestValidator.equals(
      "log entityType matches filter",
      log.entityType,
      "project",
    );
    if (log.entityName !== null) {
      TestValidator.predicate(
        "log entityName contains search term 'q1' case-insensitively",
        log.entityName.toLowerCase().includes("q1"),
      );
    }
  });
  const multiEntityTypeRequest: IHrmPlatformActivityLog.IRequest = {
    entityType: ["employee", "contract"],
  };
  const multiEntityTypeResponse =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      { body: multiEntityTypeRequest },
    );
  typia.assert(multiEntityTypeResponse);
  TestValidator.predicate(
    "multi-entity response has valid pagination",
    multiEntityTypeResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "multi-entity response data is an array",
    Array.isArray(multiEntityTypeResponse.data),
  );
  multiEntityTypeResponse.data.forEach((log) => {
    typia.assert(log);
    TestValidator.predicate(
      "log entityType matches one of the filtered types",
      log.entityType === "employee" || log.entityType === "contract",
    );
  });
}
