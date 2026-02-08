import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_promotions_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_promotions_create";
import { prepare_random_discussion_board_administrator_promotion } from "../../../prepare/prepare_random_discussion_board_administrator_promotion";

export async function test_api_administrator_promotion_grade_demotion(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate super administrator (join)
  const superAdminJoinConn: api.IConnection = { host: connection.host };
  const superAdminJoined = await authorize_super_administrator_join(
    superAdminJoinConn,
    {
      body: typia.random<IDiscussionBoardSuperAdministrator.IJoin>(),
    },
  );
  typia.assert(superAdminJoined);
  // Use token from join result
  superAdminJoinConn.headers ??= {};
  superAdminJoinConn.headers.Authorization = superAdminJoined.token.access;
  // Login super administrator with the same credentials to get fresh tokens
  // Since IDiscussionBoardSuperAdministrator.ILogin is {} (empty), random is safe
  const superAdminLoginConn: api.IConnection = { host: connection.host };
  const superAdminLogged = await authorize_super_administrator_login(
    superAdminLoginConn,
    {
      body: typia.random<IDiscussionBoardSuperAdministrator.ILogin>(),
    },
  );
  typia.assert(superAdminLogged);
  superAdminLoginConn.headers ??= {};
  superAdminLoginConn.headers.Authorization = superAdminLogged.token.access;
  // Authenticate administrator (join)
  const adminJoinConn: api.IConnection = { host: connection.host };
  const adminJoined = await authorize_administrator_join(adminJoinConn, {
    body: typia.random<IDiscussionBoardAdministrator.IJoin>(),
  });
  typia.assert(adminJoined);
  adminJoinConn.headers ??= {};
  adminJoinConn.headers.Authorization = adminJoined.token.access;
  // Login administrator
  const adminLoginConn: api.IConnection = { host: connection.host };
  const adminLogged = await authorize_administrator_login(adminLoginConn, {
    body: typia.random<IDiscussionBoardAdministrator.ILogin>(),
  });
  typia.assert(adminLogged);
  adminLoginConn.headers ??= {};
  adminLoginConn.headers.Authorization = adminLogged.token.access;
  // Create initial administrator promotion record as setup
  const initialPromotion =
    await generate_random_discussion_board_administrator_administrator_promotions_create(
      superAdminLoginConn,
      { body: {} },
    );
  typia.assert(initialPromotion);
  // Prepare empty update body (since IUpdate is empty object type)
  const updateBody: IDiscussionBoardAdministratorPromotion.IUpdate = {};
  // Perform update as super administrator
  const updatedPromotion =
    await api.functional.discussionBoard.administrator.administratorPromotions.updateAdministratorPromotion(
      superAdminLoginConn,
      {
        promotionId: typia.random<string & tags.Format<"uuid">>(),
        body: updateBody,
      },
    );
  typia.assert(updatedPromotion);
  // Attempt update as non-super administrator and expect error
  await TestValidator.error(
    "non-super admin cannot update promotion",
    async () => {
      await api.functional.discussionBoard.administrator.administratorPromotions.updateAdministratorPromotion(
        adminLoginConn,
        {
          promotionId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
