import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdmin";
import type { IEconomicPoliticalDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdminRequest";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_economic_political_discussion_board_admin_admin_requests_create } from "../../../generate/generate_random_economic_political_discussion_board_admin_admin_requests_create";
import { prepare_random_economic_political_discussion_board_admin_request } from "../../../prepare/prepare_random_economic_political_discussion_board_admin_request";

export async function test_api_admin_request_approval(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super admin to update admin requests
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEconomicPoliticalDiscussionBoardAdmin.IJoin,
  });
  // Create a new admin request (with 'pending' status)
  const adminRequest =
    await generate_random_economic_political_discussion_board_admin_admin_requests_create(
      superAdminConnection,
      { body: undefined },
    );
  typia.assert(adminRequest);
  // Update admin request status to 'approved'
  const updatedRequest =
    await api.functional.economicPoliticalDiscussionBoard.admin.requests.update(
      superAdminConnection,
      {
        id: adminRequest.id,
        body: {
          status: "approved",
        } satisfies IEconomicPoliticalDiscussionBoardAdminRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // Validate the status update
  TestValidator.equals(
    "status updated to approved",
    updatedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "updated timestamp differs from created timestamp",
    updatedRequest.updated_at !== adminRequest.created_at,
  );
  TestValidator.equals(
    "user details preserved",
    updatedRequest.user.id,
    adminRequest.user.id,
  );
}
