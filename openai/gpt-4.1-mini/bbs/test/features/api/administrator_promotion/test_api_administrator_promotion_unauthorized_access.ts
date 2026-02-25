import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
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

export async function test_api_administrator_promotion_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that unauthorized actors cannot access the administrator promotion details.
  // Step 1: Authenticate as a super administrator to create a valid promotion ID
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  // We do NOT have details on creating promotions or fetching existing promotions.
  // Since no utility or API is given for creating a promotion, we assume an existing
  // random UUID promotionId for the test.
  const promotionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 2: Try to GET the administrator promotion WITH NO authorization token
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access without token",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.promotions.atAdministratorPromotion(
        noAuthConnection,
        { promotionId },
      );
    },
  );
  // Step 3: Try to GET the administrator promotion with a non-super administrator token
  // Since no authorization utility for other roles is provided, we simulate this by
  // using a superAdministrator connection without the proper join/login (i.e., no token)
  // or just random token. Here we use a dummy token in headers to simulate unauthorized role.
  const fakeNonSuperAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer fake.invalid.token" },
  };
  await TestValidator.httpError(
    "unauthorized access with invalid token",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.promotions.atAdministratorPromotion(
        fakeNonSuperAdminConnection,
        { promotionId },
      );
    },
  );
}
