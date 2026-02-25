import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorPromotionResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionResult";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_promotion_successful(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the successful promotion of a regular administrator to super administrator by a valid super administrator.
  // 1. Super administrator registers and obtains authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongP@ssw0rd123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdminAuthorized);
  // 2. Assume the regular administrator exists in the system.
  //    (For E2E, we simulate that someone with admin grade exists already.)
  //    In tests where we don't have an API to create regular admins,
  //    we call the promotion directly and expect it to succeed assuming the target admin is identified internally.
  // 3. Send POST request to promote the regular administrator
  const promotionResult =
    await api.functional.discussionBoard.superAdministrator.administrator.promotions.createPromotion(
      superAdminConnection,
    );
  typia.assert(promotionResult);
  // 4. Validate response indicates success
  TestValidator.predicate("promotion success", promotionResult.success);
  if (promotionResult.success) {
    TestValidator.predicate(
      "promotedAdministratorId is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        promotionResult.promotedAdministratorId ?? "",
      ),
    );
  }
}
