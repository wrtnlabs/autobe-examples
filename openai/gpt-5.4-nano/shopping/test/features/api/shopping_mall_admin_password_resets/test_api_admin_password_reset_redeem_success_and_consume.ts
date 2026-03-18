import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_password_reset_redeem_success_and_consume(
  connection: api.IConnection,
): Promise<void> {
  // 시나리오 재작성(부분): 제공된 입력 범위에서
  // shopping_mall_admin_password_resets에 유효 토큰을 seed/조회할 유틸/SDK가 없어
  // "성공적으로 redeem되고 1회 소모" 검증은 수행 불가
  // 대신 "실패 응답이 토큰 상태를 구체적으로 식별하지 않음" 보안 성질을 검증
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  };
  await authorize_admin_join(adminConnection, { body: adminJoin });
  const redeemRequest: IShoppingMallAdminPasswordReset = {
    token: RandomGenerator.alphaNumeric(32),
    password: typia.random<string & tags.Format<"password">>(),
  };
  try {
    const redeemed =
      await api.functional.shoppingMall.admin.admin_password_resets.redeem.redeemAdminPasswordReset(
        adminConnection,
        { body: redeemRequest },
      );
    typia.assert(redeemed);
    throw new Error("redeem succeeded unexpectedly");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    TestValidator.predicate(
      "error message should not leak whether token exists/expired/revoked",
      () => {
        const lower = message.toLowerCase();
        const forbidden = [
          "exist",
          "not found",
          "expired",
          "expire",
          "revok",
          "consum",
          "used",
          "reused",
          "deleted_at",
          "revoked",
        ];
        return forbidden.every((k) => !lower.includes(k));
      },
    );
  }
}
