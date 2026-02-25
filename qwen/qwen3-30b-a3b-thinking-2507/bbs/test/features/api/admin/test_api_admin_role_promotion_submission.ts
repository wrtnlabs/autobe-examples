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

export async function test_api_admin_role_promotion_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEconomicPoliticalDiscussionBoardAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com",
        referrer: "https://example.com",
      },
    });
  // 2. Create admin role promotion request with valid reason
  const reason = RandomGenerator.paragraph({ sentences: 5 });
  const request =
    await api.functional.economicPoliticalDiscussionBoard.admin.admin.requests.create(
      adminConnection,
      {
        body: {
          reason:
            reason satisfies IEconomicPoliticalDiscussionBoardAdminRequest.ICreate["reason"],
        },
      },
    );
  typia.assert(request);
  // 3. Validate business rules
  TestValidator.equals(
    "request status is 'pending'",
    request.status,
    "pending",
  );
  TestValidator.predicate("reason length ≥ 50", reason.length >= 50);
  TestValidator.equals(
    "user profile summary matches",
    request.user.id,
    admin.admin.id,
  );
}
