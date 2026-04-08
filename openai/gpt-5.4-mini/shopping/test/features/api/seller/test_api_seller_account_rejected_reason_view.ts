import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_account_rejected_reason_view(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const joined = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.ILogin,
  });
  typia.assert(authorized);
  const account =
    await api.functional.mallPlatform.seller.sellerAccount.at(loginConnection);
  typia.assert(account);
  TestValidator.equals(
    "seller account id matches auth identity",
    account.id,
    authorized.id,
  );
  TestValidator.equals(
    "seller account email matches auth identity",
    account.email,
    authorized.email,
  );
  TestValidator.predicate(
    "seller account response is scoped to the authenticated seller",
    account.email === email,
  );
  TestValidator.predicate(
    "seller account status is a populated moderation state",
    account.approval_status.length > 0,
  );
  TestValidator.predicate(
    "seller rejection reason is either absent or exposed as text when rejected",
    account.rejection_reason === null || account.rejection_reason.length > 0,
  );
  TestValidator.equals(
    "seller profile owner matches seller account",
    account.sellerProfile.sellerAccount.id,
    account.id,
  );
}
