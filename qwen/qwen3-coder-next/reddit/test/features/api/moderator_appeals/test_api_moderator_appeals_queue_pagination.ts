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

export async function test_api_moderator_appeals_queue_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: IRedditCloneModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(8),
        displayName: RandomGenerator.name(),
      },
    });
  // 2. Get appeals queue with pagination parameters
  const response =
    await api.functional.redditClone.moderator.appeals.queue.at(
      moderatorConnection,
    );
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.equals("pagination exists", response.pagination, {
    current: 1,
    limit: 10,
    records: response.data.length,
    pages: response.data.length > 0 ? 1 : 0,
  });
  // 4. Validate appeal summary structure
  for (const appeal of response.data) {
    typia.assert(appeal);
    typia.assert(appeal.reporter);
    typia.assert(appeal.report);
    // Validate nullability of resolvedBy
    if (appeal.resolvedBy !== null) {
      typia.assert(appeal.resolvedBy);
    }
    // Validate status values
    TestValidator.predicate(
      "status is valid",
      ["pending", "approved", "denied"].includes(appeal.status),
    );
    // Validate timestamp formats
    TestValidator.predicate("created_at is ISO string", () =>
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        appeal.createdAt,
      ),
    );
    if (appeal.resolvedAt !== null) {
      const resolvedAt = appeal.resolvedAt;
      TestValidator.predicate("resolved_at is ISO string", () =>
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
          resolvedAt,
        ),
      );
    }
  }
}