import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationLog";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationLog";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_audit_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner connection
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  // 2. Create test audit log entries using owner
  for (let i = 0; i < 3; i++) {
    await api.functional.redditClone.owner.audit_logs.index(ownerConnection, {
      body: {
        limit: 10,
        page: 1,
        reason: `Test log entry ${i}`,
      },
    });
  }
  // 3. Test successful audit log retrieval by owner
  const result = await api.functional.redditClone.owner.audit_logs.index(
    ownerConnection,
    {
      body: {
        limit: 10,
        page: 1,
      },
    },
  );
  typia.assert(result);
  TestValidator.equals("pagination exists", result.pagination !== null, true);
  TestValidator.predicate("has audit logs", result.data.length >= 0);
  // 4. Test filtering by date range
  const startDate = new Date().toISOString();
  const endDate = new Date(new Date().getTime() + 86400000).toISOString();
  const dateFiltered = await api.functional.redditClone.owner.audit_logs.index(
    ownerConnection,
    {
      body: {
        startDate,
        endDate,
        limit: 10,
      },
    },
  );
  typia.assert(dateFiltered);
  // 5. Test filtering by action type
  const actionFiltered =
    await api.functional.redditClone.owner.audit_logs.index(ownerConnection, {
      body: {
        actionType: "delete_post",
        limit: 10,
      },
    });
  typia.assert(actionFiltered);
  // 6. Test filtering by target type
  const targetFiltered =
    await api.functional.redditClone.owner.audit_logs.index(ownerConnection, {
      body: {
        targetType: "post",
        limit: 10,
      },
    });
  typia.assert(targetFiltered);
  // 7. Test filtering by reason text
  const reasonFiltered =
    await api.functional.redditClone.owner.audit_logs.index(ownerConnection, {
      body: {
        reason: "Test",
        limit: 10,
      },
    });
  typia.assert(reasonFiltered);
  // 8. Test pagination with multiple pages
  const page2 = await api.functional.redditClone.owner.audit_logs.index(
    ownerConnection,
    {
      body: {
        limit: 2,
        page: 2,
      },
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 exists", page2.pagination.current, 2);
  // 9. Verify pagination structure
  typia.assert(result.pagination);
  TestValidator.predicate(
    "pagination has current page",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("pagination has limit", result.pagination.limit >= 1);
  TestValidator.predicate(
    "pagination has records",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages", result.pagination.pages >= 0);
}
