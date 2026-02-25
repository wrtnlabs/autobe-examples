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

export async function test_api_administrator_promotion_self_promotion_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super administrator and log in using the authorize utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  // After join, superAdminConnection.headers should have the updated Authorization token
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = superAdmin.token.access;
  // 2. Attempt to promote self as super administrator via promotions endpoint
  const output =
    await api.functional.discussionBoard.superAdministrator.administrator.promotions.createPromotion(
      superAdminConnection,
    );
  // 3. Assert the response is of type IDiscussionBoardAdministratorPromotionResult
  typia.assert(output);
  // 4. Verify promotion is denied
  TestValidator.equals("promotion success flag", output.success, false);
  TestValidator.predicate(
    "promotion failure message present",
    typeof output.message === "string" && output.message.length > 0,
  );
  TestValidator.equals(
    "promotedAdministratorId is undefined",
    output.promotedAdministratorId,
    undefined,
  );
}
