import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemLog";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemLog";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_system_logs_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: typia.random<IRedditCommunityMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // 2. Create actor-specific connection with JWT token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 3. Call system-logs endpoint with default pagination
  const logs = await api.functional.redditCommunity.system_logs.index(
    memberConnection,
    {
      body: {
        exclude_deleted: true,
      },
    },
  );
  typia.assert(logs);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "current page is at least 1",
    logs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is within range (1-100)",
    logs.pagination.limit >= 1 && logs.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records is non-negative",
    logs.pagination.records >= 0,
  );
  TestValidator.predicate("pages is non-negative", logs.pagination.pages >= 0);
  // 5. Validate data array exists and is properly typed
  TestValidator.equals(
    "data is array",
    logs.data,
    Array.isArray(logs.data) ? logs.data : [],
  );
  // 6. Validate each log in data array
  for (const log of logs.data) {
    typia.assert(log);
    // 7. Validate soft-deleted logs are excluded (deletedAt should be null)
    TestValidator.equals(
      "deletedAt is null for active logs",
      log.deletedAt,
      null,
    );
    // 8. Validate actor structure if present
    if (log.actor !== null) {
      typia.assert(log.actor);
      TestValidator.predicate(
        "actor id is valid uuid",
        /^[0-9a-f-]{36}$/i.test(log.actor.id),
      );
      TestValidator.predicate(
        "actor username is string",
        typeof log.actor.username === "string",
      );
      TestValidator.predicate(
        "actor created_at is valid date-time",
        !isNaN(Date.parse(log.actor.created_at)),
      );
    }
    // 9. Validate timestamp format
    TestValidator.predicate(
      "createdAt is valid date-time",
      !isNaN(Date.parse(log.createdAt)),
    );
    TestValidator.predicate(
      "updatedAt is valid date-time",
      !isNaN(Date.parse(log.updatedAt)),
    );
  }
  // 10. Validate pagination accuracy
  TestValidator.equals(
    "records count matches actual data",
    logs.pagination.records,
    logs.data.length,
  );
  const expectedPages = Math.ceil(
    logs.data.length / logs.pagination.limit,
  ) satisfies number as number & tags.Type<"int32"> & tags.Minimum<0>;
  TestValidator.equals(
    "pages calculated correctly",
    logs.pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "current page is 1 with default params",
    logs.pagination.current,
    1,
  );
}
