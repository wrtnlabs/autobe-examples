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
  const email = typia.random<string & tags.Format<"email">>();
  const password = `Aa1!${RandomGenerator.alphaNumeric(12)}`;
  const joined = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const output = await authorize_seller_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.ILogin,
  });
  typia.assert(output);
  TestValidator.equals(
    "seller id should match joined account",
    output.id,
    joined.id,
  );
  TestValidator.equals(
    "seller email should match login email",
    output.email,
    email,
  );
  TestValidator.equals(
    "seller account status should be present and readable",
    output.status.status,
    joined.status.status,
  );
  TestValidator.equals(
    "seller rejection reason should be preserved",
    output.status.rejectionReason,
    joined.status.rejectionReason,
  );
  TestValidator.predicate(
    "token access should be present",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh should be present",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at should be present",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshable_until should be present",
    output.token.refreshable_until.length > 0,
  );
}
