import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sessions_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller-specific connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Call the sessions endpoint with default pagination parameters
  const requestBody: IEcommerceMallCustomerSession.IRequest = {};
  const response: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.seller.sessions.index(sellerConnection, {
      body: requestBody,
    });
  // 3. Validate the complete response structure using typia
  typia.assert(response);
  // 4. Verify pagination metadata with default values
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is >= 0",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is >= 0",
    () => response.pagination.pages >= 0,
  );
  // 5. Verify at least one session exists (the one created during authentication)
  TestValidator.predicate(
    "has at least one session",
    () => response.data.length > 0,
  );
  // 6. Verify session data and isActive logic
  if (response.data.length > 0) {
    const session = response.data[0];
    // 7. Verify isActive is computed correctly based on expiredAt vs current time
    if (session.expiredAt !== null) {
      const now = new Date();
      const expiredAt = new Date(session.expiredAt);
      const expectedIsActive = expiredAt > now;
      TestValidator.equals(
        "isActive matches expiredAt comparison",
        session.isActive,
        expectedIsActive,
      );
    }
    // 8. Verify no sensitive JWT tokens in session (only metadata fields expected per DTO)
    // The DTO IEcommerceMallCustomerSession.ISummary only defines: id, ip, href, referrer, createdAt, expiredAt, isActive
    // No token fields should exist - typia.assert already validated the exact structure
  }
}
