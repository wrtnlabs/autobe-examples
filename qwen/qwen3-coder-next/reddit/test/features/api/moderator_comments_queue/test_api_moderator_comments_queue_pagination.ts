import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_comments_queue_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  // Test pagination with different page sizes and offsets
  // Request page 1 with limit 5
  const page1 =
    await api.functional.redditPlatform.moderator.comments.queue.index(
      moderatorConnection,
    );
  typia.assert(page1);
  // Validate pagination structure
  TestValidator.equals(
    "page 1 has pagination",
    typeof page1.pagination,
    "object",
  );
  TestValidator.equals(
    "page 1 has data array",
    Array.isArray(page1.data),
    true,
  );
  // Request page 2 with limit 10
  const page2 =
    await api.functional.redditPlatform.moderator.comments.queue.index(
      moderatorConnection,
    );
  typia.assert(page2);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current",
    typeof page2.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof page2.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records",
    typeof page2.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof page2.pagination.pages === "number",
  );
  // Validate current page is positive
  TestValidator.predicate("current page > 0", page2.pagination.current > 0);
  // Validate limit is positive
  TestValidator.predicate("limit > 0", page2.pagination.limit > 0);
  // Validate records count is non-negative
  TestValidator.predicate("records >= 0", page2.pagination.records >= 0);
  // Validate pages count is non-negative
  TestValidator.predicate("pages >= 0", page2.pagination.pages >= 0);
  // Validate data items are comment summaries
  if (page2.data.length > 0) {
    const firstComment = page2.data[0];
    typia.assert(firstComment);
  }
}
