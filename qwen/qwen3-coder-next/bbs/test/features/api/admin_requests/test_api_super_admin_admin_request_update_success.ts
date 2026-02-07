import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRequest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminsRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_admin_request_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Super admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const registered = await api.functional.discussionBoard.auth.super_admin.join(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(registered);
  // Step 2: Retrieve pending administrator requests
  const requests = await api.functional.discussionBoard.admin.requests.index(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardAdminsRequest.IRequest>(),
    },
  );
  typia.assert(requests);
  // Verify we have at least one request to update
  TestValidator.predicate("has pending requests", requests.data.length > 0);
  // Step 3: Update the first request
  // Since ISummary is defined as empty object {}, we need to use type assertion
  const requestId = (requests.data[0] as any).id;
  const updatedRequest =
    await api.functional.discussionBoard.superAdmin.admin.requests.update(
      adminConnection,
      {
        requestId: requestId,
        body: typia.random<IDiscussionBoardAdminsRequest.IUpdate>(),
      },
    );
  typia.assert(updatedRequest);
  // Step 4: Verify the update was successful
  TestValidator.equals(
    "request updated successfully",
    (updatedRequest as any).id,
    requestId,
  );
}
