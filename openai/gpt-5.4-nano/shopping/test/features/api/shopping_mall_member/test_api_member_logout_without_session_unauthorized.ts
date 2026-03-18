import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_logout_without_session_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Intentionally unauthenticated: do not call authorize_member_join/login/refresh.
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "member logout without active session should be unauthorized",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.member.sessions.current.logout(
        unauthConnection,
      );
    },
  );
  // Security check: ensure repeated attempts still fail without creating a session side-effect.
  await TestValidator.httpError(
    "member logout unauthorized must remain unauthorized on subsequent call",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.member.sessions.current.logout(
        unauthConnection,
      );
    },
  );
}
