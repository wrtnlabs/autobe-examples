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

export async function test_api_seller_registration_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const body = {
    email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IMallPlatformSeller.IJoin;
  const authorized = await authorize_seller_join(sellerConnection, {
    body,
  });
  typia.assert(authorized);
  TestValidator.equals("registered seller email", authorized.email, body.email);
  TestValidator.equals(
    "new seller account starts pending approval",
    authorized.status.status,
    "pending",
  );
  TestValidator.equals(
    "pending account has no rejection reason",
    authorized.status.rejectionReason,
    null,
  );
  TestValidator.predicate(
    "authorization token access exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization token refresh exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.equals(
    "seller profile is initialized for the new seller",
    authorized.sellerProfile.sellerAccount.id,
    authorized.id,
  );
}
