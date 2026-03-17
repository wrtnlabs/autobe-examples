import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeOwnerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeOwnerAuditLog";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import type { IRedditLikeOwnerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwnerAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_audit_log_retrieve_my_activity(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner-specific connection and authenticate via registration
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  typia.assert(authorized);
  // Step 2: Configure audit log request with pagination parameters
  const requestBody = {
    page: "1",
    limit: 10,
  } satisfies IRedditLikeOwnerAuditLog.IRequest;
  // Step 3: Retrieve owner's activity audit log
  const response =
    await api.functional.redditLike.owner.audit_logs.my_activity.index(
      ownerConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(response);
  // Step 4: Validate business logic - verify only authenticated owner's activities are returned
  if (response.data.length > 0) {
    const activityOwner = response.data[0]!.owner;
    TestValidator.equals(
      "returned activity belongs to authenticated owner",
      activityOwner.id,
      authorized.id,
    );
  }
}