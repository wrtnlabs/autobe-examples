import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_admin_order_erase_forbidden_non_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create and login a non-admin (member) actor
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberJoined = await authorize_member_join(memberJoinConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberJoined);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberLogged = await authorize_member_login(memberConnection, {
    body: {
      email: memberJoined.email,
      password,
    } satisfies IShoppingMallMember.ILogin,
  });
  typia.assert(memberLogged);
  // 2) Attempt admin-only erase as non-admin
  const nonAdminOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "non-admin cannot erase order via admin endpoint",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.admin.orders.erase(
        memberConnection,
        {
          orderId: nonAdminOrderId,
        },
      );
    },
  );
}
