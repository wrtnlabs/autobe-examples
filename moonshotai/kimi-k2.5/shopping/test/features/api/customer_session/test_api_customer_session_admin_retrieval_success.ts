import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_customer_session_admin_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies Partial<IEcommerceMallAdmin.IJoin>,
  });
  // Step 2: List customer sessions to find an existing sessionId
  const sessionList: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.admin.customer_sessions.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessionList);
  // Ensure at least one session exists in the system
  TestValidator.predicate(
    "At least one customer session exists",
    sessionList.data.length > 0,
  );
  // Get the first session id from the list
  const sessionId = sessionList.data[0]!.id;
  // Step 3: Retrieve specific session by ID
  const session: IEcommerceMallCustomerSession =
    await api.functional.ecommerceMall.admin.customer_sessions.at(
      adminConnection,
      {
        sessionId: sessionId,
      },
    );
  typia.assert(session);
  // Step 4: Validate the retrieved session ID matches the requested ID
  TestValidator.equals("Session ID matches requested", session.id, sessionId);
}
