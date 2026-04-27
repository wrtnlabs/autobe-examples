import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Precondition: Register a seller to establish valid seller identity context
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // TestCase A: No Auth Token — call endpoint without any Authorization header
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should reject unauthenticated request (no auth token)",
    401,
    async () => {
      await api.functional.eCommerceMall.seller.profile.snapshots.index(
        noAuthConnection,
        {
          body: {} satisfies IECommerceMallSellerProfileSnapshot.IRequest,
        },
      );
    },
  );
  // TestCase B: Invalid/Broken Auth Token
  const badTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: "Bearer invalid.jwt.token",
    },
  };
  await TestValidator.httpError(
    "should reject invalid auth token",
    401,
    async () => {
      await api.functional.eCommerceMall.seller.profile.snapshots.index(
        badTokenConnection,
        {
          body: {} satisfies IECommerceMallSellerProfileSnapshot.IRequest,
        },
      );
    },
  );
}
