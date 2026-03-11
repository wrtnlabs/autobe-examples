import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrator_promotion_already_super_admin_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create first super administrator (actor)
  const actorConnection: api.IConnection = { host: connection.host };
  const actor = await authorize_super_admin_join(actorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(actor);
  // Create second super administrator (target)
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_super_admin_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(target);
  // Verify target is already a super administrator
  TestValidator.equals("target admin grade", target.admin_grade, "super");
  // Attempt to promote the already super administrator
  await TestValidator.error(
    "promotion should fail for super admin",
    async () => {
      await api.functional.discussionBoard.superAdmin.administrators.promote(
        actorConnection,
        {
          administratorId: target.id,
        },
      );
    },
  );
}
