import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_account_own_information_update(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: `seller-${RandomGenerator.alphaNumeric(8)}@test.com` as any,
      password: "P@ssw0rd1234" as any,
      href: "https://example.com/register" as any,
      referrer: "https://example.com" as any,
      ip: "127.0.0.1",
    } as IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const originalEmail = sellerJoin.email;
  const updatedEmail =
    `updated-${RandomGenerator.alphaNumeric(8)}@test.com` as any;
  const updated = await api.functional.mallPlatform.seller.account.update(
    sellerConnection,
    {
      body: {
        email: updatedEmail,
      } as IMallPlatformCustomer.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "seller account id should remain the same",
    updated.id,
    sellerJoin.id,
  );
  TestValidator.equals(
    "seller account email should be updated",
    updated.email,
    updatedEmail,
  );
  TestValidator.equals(
    "seller account status should remain unchanged",
    updated.status,
    sellerJoin.status,
  );
  TestValidator.equals(
    "seller account createdAt should remain unchanged",
    updated.createdAt,
    sellerJoin.createdAt,
  );
  TestValidator.equals(
    "seller account deletedAt should remain unchanged",
    updated.deletedAt,
    sellerJoin.deletedAt,
  );
  const conflictConnection: api.IConnection = { host: connection.host };
  const conflictSeller = await authorize_seller_join(conflictConnection, {
    body: {
      email: `conflict-${RandomGenerator.alphaNumeric(8)}@test.com` as any,
      password: "P@ssw0rd1234" as any,
      href: "https://example.com/register" as any,
      referrer: "https://example.com" as any,
      ip: "127.0.0.1",
    } as IMallPlatformSeller.IJoin,
  });
  typia.assert(conflictSeller);
  await TestValidator.error("duplicate email update should fail", async () => {
    await api.functional.mallPlatform.seller.account.update(sellerConnection, {
      body: {
        email: conflictSeller.email,
      } as IMallPlatformCustomer.IUpdate,
    });
  });
  const afterFailure = await api.functional.mallPlatform.seller.account.update(
    sellerConnection,
    {
      body: {
        email: originalEmail,
      } as IMallPlatformCustomer.IUpdate,
    },
  );
  typia.assert(afterFailure);
  TestValidator.equals(
    "account id should still be the same after failure",
    afterFailure.id,
    sellerJoin.id,
  );
  TestValidator.equals(
    "account email should be restorable after failure",
    afterFailure.email,
    originalEmail,
  );
}
