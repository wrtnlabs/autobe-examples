import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationLog";
import type { IRedditCloneBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanRecord";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import type { IRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationLog";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
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
import { generate_random_reddit_clone_owner_communities_bans_create_ban } from "../../../generate/generate_random_reddit_clone_owner_communities_bans_create_ban";
import { prepare_random_reddit_clone_ban_record } from "../../../prepare/prepare_random_reddit_clone_ban_record";

export async function test_api_owner_audit_logs_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Login as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: "owner@test.com",
      password: "SecurePass123!",
      username: "owner123",
      displayName: "Owner User",
    } satisfies IRedditCloneOwner.IJoin,
  });
  // 2. Create multiple audit log entries for pagination testing
  const auditLogs: IRedditCloneModerationLog.ISummary[] = [];
  for (let i = 0; i < 75; i++) {
    const auditLog = await api.functional.redditClone.owner.audit_logs.index(
      ownerConnection,
      {
        body: {
          actionType: "ban_user",
          targetType: "post",
        } satisfies IRedditCloneModerationLog.IRequest,
      },
    );
    typia.assert(auditLog);
    if (auditLog.data.length > 0) {
      auditLogs.push(...auditLog.data);
    }
  }
  // 3. Test pagination with default page size (50)
  const page1 = await api.functional.redditClone.owner.audit_logs.index(
    ownerConnection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IRedditCloneModerationLog.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 count", page1.data.length, 50);
  TestValidator.equals(
    "page 1 total",
    page1.pagination.records,
    auditLogs.length,
  );
  TestValidator.equals(
    "page 1 pages",
    page1.pagination.pages,
    Math.ceil(auditLogs.length / 50),
  );
  // 4. Test pagination with smaller page size (25)
  const page2 = await api.functional.redditClone.owner.audit_logs.index(
    ownerConnection,
    {
      body: {
        page: 2,
        limit: 25,
      } satisfies IRedditCloneModerationLog.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 count", page2.data.length, 25);
  // 5. Test sorting (newest first by default)
  if (page1.data.length >= 2) {
    TestValidator.predicate(
      "newest first",
      () =>
        new Date(page1.data[0].createdAt) >= new Date(page1.data[1].createdAt),
    );
  }
  // 6. Test with different limit values
  const page3 = await api.functional.redditClone.owner.audit_logs.index(
    ownerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditCloneModerationLog.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.predicate(
    "all results when limit exceeds total",
    () => page3.data.length >= auditLogs.length,
  );
  // 7. Test boundary conditions
  const emptyPage = await api.functional.redditClone.owner.audit_logs.index(
    ownerConnection,
    {
      body: {
        page: 999,
        limit: 10,
      } satisfies IRedditCloneModerationLog.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty page data", emptyPage.data.length, 0);
}
