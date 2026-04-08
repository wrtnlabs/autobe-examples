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

export async function test_api_seller_login_success(
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
  const authenticated = await authorize_seller_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.ILogin,
  });
  typia.assert(authenticated);
  typia.assert(authenticated.token);
  TestValidator.equals(
    "seller email should match login input",
    authenticated.email,
    email,
  );
  TestValidator.equals(
    "seller id should match joined account",
    authenticated.id,
    joined.id,
  );
  TestValidator.equals(
    "seller status should match joined account",
    authenticated.status,
    joined.status,
  );
  TestValidator.equals(
    "rejection reason should match joined account",
    authenticated.rejectionReason,
    joined.rejectionReason,
  );
  TestValidator.equals(
    "seller deletedAt should match joined account",
    authenticated.deletedAt,
    joined.deletedAt,
  );
  TestValidator.equals(
    "seller profile should match joined account",
    authenticated.sellerProfile,
    joined.sellerProfile,
  );
  TestValidator.predicate(
    "access token exists",
    authenticated.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authenticated.token.refresh.length > 0,
  );
}
