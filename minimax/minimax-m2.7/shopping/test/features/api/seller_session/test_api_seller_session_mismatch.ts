import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_session_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. First seller registers and logs in
  const sellerACredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAResponse = await api.functional.ecommerceMall.auth.seller.join(
    connection,
    { body: sellerACredentials },
  );
  typia.assert(sellerAResponse);
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerAConnection, {
    body: {
      email: sellerACredentials.email,
      password: sellerACredentials.password,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Second seller registers and logs in
  const sellerBCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerBResponse = await api.functional.ecommerceMall.auth.seller.join(
    connection,
    { body: sellerBCredentials },
  );
  typia.assert(sellerBResponse);
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerBConnection, {
    body: {
      email: sellerBCredentials.email,
      password: sellerBCredentials.password,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 4. Admin attempts to retrieve a non-existent session for seller B
  // Using a random UUID as sessionId that doesn't exist in the system
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // This should return 404 because the session ID doesn't exist
  await TestValidator.httpError(
    "non-existent session returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.sellers.sessions.at(
        adminConnection,
        {
          sellerId: sellerBResponse.id,
          sessionId: nonExistentSessionId,
        },
      ),
  );
  // 5. Additionally test with mismatched seller ID and session ID
  // Using seller A's ID but with a session ID that doesn't belong to them
  await TestValidator.httpError(
    "mismatched session ownership returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.sellers.sessions.at(
        adminConnection,
        {
          sellerId: sellerAResponse.id,
          sessionId: nonExistentSessionId,
        },
      ),
  );
}
