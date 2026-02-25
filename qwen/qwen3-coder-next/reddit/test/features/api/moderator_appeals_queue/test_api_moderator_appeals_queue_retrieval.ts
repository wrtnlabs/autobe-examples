import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationAppeal";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test retrieval of pending moderation appeals queue for authenticated moderator.
 * The scenario validates that only pending appeals are returned, appeals are
 * properly linked to their associated reports and reporters, and pagination
 * information is correctly included. The moderator should only see appeals from
 * communities they moderate.
 */
export async function test_api_moderator_appeals_queue_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(moderatorData);
  // 2. Call appeals queue endpoint
  const result: IPageIRedditCloneModerationAppeal.ISummary =
    await api.functional.redditClone.moderator.appeals.queue.at(
      moderatorConnection,
    );
  typia.assert(result);
  // 3. Validate pagination structure
  typia.assert(result.pagination);
  TestValidator.predicate("has pagination data", result.pagination !== null);
  TestValidator.predicate(
    "has valid current page",
    result.pagination.current > 0,
  );
  TestValidator.predicate("has valid limit", result.pagination.limit >= 0);
  TestValidator.predicate(
    "has valid records count",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages count",
    result.pagination.pages >= 0,
  );
  // 4. Validate appeals data array
  typia.assert(result.data);
  TestValidator.predicate("has appeals array", Array.isArray(result.data));
  // 5. Validate each appeal structure
  for (const appeal of result.data) {
    typia.assert(appeal);
    // Validate required fields
    TestValidator.predicate("has valid appeal ID", appeal.id !== null);
    TestValidator.predicate(
      "has appeal content",
      appeal.appealContent !== null,
    );
    TestValidator.equals("status is pending", appeal.status, "pending");
    TestValidator.predicate(
      "has no resolvedAt date",
      appeal.resolvedAt === null,
    );
    TestValidator.predicate("has createdAt", appeal.createdAt !== null);
    TestValidator.predicate("has updatedAt", appeal.updatedAt !== null);
    TestValidator.predicate("has null deletedAt", appeal.deletedAt === null);
    // Validate reporter relationship
    typia.assert(appeal.reporter);
    TestValidator.predicate("has reporter ID", appeal.reporter.id !== null);
    TestValidator.predicate(
      "has reporter username",
      appeal.reporter.username !== null,
    );
    // Validate report relationship
    typia.assert(appeal.report);
    TestValidator.predicate("has report ID", appeal.report.id !== null);
    TestValidator.predicate(
      "has report content type",
      appeal.report.content !== null,
    );
    TestValidator.predicate("has report status", appeal.report.status !== null);
    // Validate relationships
    TestValidator.predicate(
      "reporter is valid member",
      appeal.reporter !== null,
    );
    TestValidator.predicate("resolvedBy is null", appeal.resolvedBy === null);
    TestValidator.predicate("report is valid", appeal.report !== null);
  }
}
