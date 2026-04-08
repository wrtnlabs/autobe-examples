import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_customer_session_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {} satisfies Partial<IEcommerceMallSuperAdmin.IJoin>,
  });
  typia.assert(authorized);
  // 2. List customer sessions to find a valid sessionId
  const listRequest: IEcommerceMallCustomerSession.IRequest = {
    status: "all",
    limit: 20,
    page: 1,
    sortBy: "created_at",
    sortOrder: "desc",
  };
  const sessionsPage =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      {
        body: listRequest,
      },
    );
  typia.assert(sessionsPage);
  // 3. Get the first session from the list
  const firstSession = sessionsPage.data[0];
  if (firstSession === undefined) {
    throw new Error("No customer sessions found in the system");
  }
  typia.assert(firstSession);
  // 4. Retrieve the specific session by ID
  const session =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.at(
      superAdminConnection,
      {
        sessionId: firstSession.id,
      },
    );
  typia.assert(session);
  // 5. Verify that the retrieved session matches the list item
  TestValidator.equals("session ID matches", session.id, firstSession.id);
  TestValidator.equals("IP address matches", session.ip, firstSession.ip);
  TestValidator.equals("href matches", session.href, firstSession.href);
  TestValidator.equals(
    "referrer matches",
    session.referrer,
    firstSession.referrer,
  );
  TestValidator.equals(
    "createdAt matches",
    session.createdAt,
    firstSession.createdAt,
  );
}
