import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { prepare_random_discussion_board_admin_session } from "../../../prepare/prepare_random_discussion_board_admin_session";
import { generate_random_discussion_board_admin_admins_sessions_create } from "../../../generate/generate_random_discussion_board_admin_admins_sessions_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_discussion_board_admin_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const admin: IDiscussionBoardAdmin.IAuthorized = await authorize_admin_join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string &
            tags.MinLength<8> &
            tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$">
        >(),
      },
    },
  );
  // Step 2: Create session
  const session: IDiscussionBoardAdminSession =
    await generate_random_discussion_board_admin_admins_sessions_create(
      connection,
      {
        body: {
          device_info: RandomGenerator.paragraph({ sentences: 1 }),
          ip: typia
            .random<string>()
            .replace(/(?:[^0-9.])+/g, "")
            .replace(/\.+/g, ".")
            .replace(/^[^0-9]+/g, "")
            .replace(/[^0-9.]+$/g, "")
            .substring(0, 15),
          user_agent: typia
            .random<string>()
            .replace(/[^a-zA-Z0-9\-.\_ ]+/g, "")
            .substring(0, 100),
        },
        params: {
          adminId: admin.id,
        },
      },
    );
  // Step 3: Validate session data
  typia.assert(session);
  TestValidator.equals("session admin matches", session.admin.id, admin.id);
  TestValidator.equals("session status is active", session.status, "active");
}
