import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationAppeal";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_filter_appeals_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(2),
      displayName: RandomGenerator.name(2),
    } satisfies IRedditCloneOwner.IJoin,
  });
  typia.assert(owner);
  // 2. Test filtering by "pending" status
  const pendingResult =
    await api.functional.redditClone.owner.communities.appeals.index(
      ownerConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
          status: "pending",
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.equals(
    "only pending appeals returned",
    pendingResult.data.length,
    1,
  );
  // 3. Test filtering by "approved" status
  const approvedResult =
    await api.functional.redditClone.owner.communities.appeals.index(
      ownerConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
          status: "approved",
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.equals(
    "only approved appeals returned",
    approvedResult.data.length,
    1,
  );
  // 4. Test filtering by "denied" status (should be empty)
  const deniedResult =
    await api.functional.redditClone.owner.communities.appeals.index(
      ownerConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
          status: "denied",
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(deniedResult);
  TestValidator.equals("no denied appeals exist", deniedResult.data.length, 0);
  // 5. Test filtering without status (should return all)
  const allResult =
    await api.functional.redditClone.owner.communities.appeals.index(
      ownerConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.equals(
    "all appeals returned when no status filter",
    allResult.data.length,
    2,
  );
}
