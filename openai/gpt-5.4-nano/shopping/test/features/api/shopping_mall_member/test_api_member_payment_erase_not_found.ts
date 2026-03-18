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

export async function test_api_member_payment_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate a member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  // Create a connection that uses the issued access token
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers ??= {};
  authConnection.headers.Authorization = memberAuth.token.access;
  // 2) Generate a paymentId that (very likely) does not exist
  const nonExistentPaymentId = typia.random<string & tags.Format<"uuid">>();
  // 3) Deleting a non-existent payment attempt must return 404
  await TestValidator.httpError(
    "member erasing a non-existent payment should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.member.payments.erase(authConnection, {
        paymentId: nonExistentPaymentId,
      });
    },
  );
  // 4) Ensure no side-effect record is created (second attempt should still be 404)
  await TestValidator.httpError(
    "member erasing the same non-existent payment should still return 404",
    404,
    async () => {
      await api.functional.shoppingMall.member.payments.erase(authConnection, {
        paymentId: nonExistentPaymentId,
      });
    },
  );
}
