import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import type { IEconomyPoliticsBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdministratorRequest";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_economy_politics_board_user_administrator_requests_create } from "../../../generate/generate_random_economy_politics_board_user_administrator_requests_create";
import { prepare_random_economy_politics_board_administrator_request } from "../../../prepare/prepare_random_economy_politics_board_administrator_request";

export async function test_api_administrator_request_update_reject(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user account (as regular user)
  const userConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://example.com",
      referrer: "http://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create an administrator request as the user
  const adminRequest =
    await api.functional.economyPoliticsBoard.user.administrator_requests.create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(adminRequest);
  // 3. Authenticate as admin
  const adminConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "adminPassword123",
    },
  });
  // 4. Update the request to 'rejected' with a reason
  const updatedRequest =
    await api.functional.economyPoliticsBoard.admin.administrator_requests.update(
      adminConnection,
      {
        requestId: adminRequest.id,
        body: {
          status: "rejected",
          reason:
            "Requested administrator role with inappropriate justification.",
        },
      },
    );
  typia.assert(updatedRequest);
  // 5. Verify the status transition
  TestValidator.equals(
    "Status should be rejected",
    updatedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "Reason should be provided",
    updatedRequest.reason,
    "Requested administrator role with inappropriate justification.",
  );
}
