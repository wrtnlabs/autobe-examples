import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_ban_appeal_not_found_edge_case(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Authenticate as user using utility function
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Test with randomly generated but non-existent UUIDs
  // Only test valid UUID formats to avoid type errors - focus on "not found" scenarios
  const randomBanId = typia.random<string & tags.Format<"uuid">>();
  const randomAppealId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent ban appeal should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.user.bans.appeals.at(
        userConnection,
        {
          banId: randomBanId,
          appealId: randomAppealId,
        },
      );
    },
  );
  // Test with different combination of valid but non-existent UUIDs
  const anotherRandomBanId = typia.random<string & tags.Format<"uuid">>();
  const anotherRandomAppealId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "another non-existent ban appeal should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.user.bans.appeals.at(
        userConnection,
        {
          banId: anotherRandomBanId,
          appealId: anotherRandomAppealId,
        },
      );
    },
  );
}
