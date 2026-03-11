import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sessions_view_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins to create account
  const sellerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(joined);
  // 2. Seller views their own sessions
  const sessions = await api.functional.ecommerceMall.seller.sessions.index(
    sellerConnection,
    {
      body: typia.random<IEcommerceMallSellerSession.IRequest>(),
    },
  );
  typia.assert(sessions);
  // 3. Validate pagination metadata exists
  TestValidator.equals("current page", sessions.pagination.current >= 1, true);
  TestValidator.equals(
    "limit is positive",
    sessions.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "records is at least 1",
    sessions.pagination.records >= 1,
    true,
  );
  // 4. Validate at least one session exists (current session)
  TestValidator.predicate(
    "has at least one session",
    sessions.data.length >= 1,
  );
  // 5. Validate session structure for each session
  for (const session of sessions.data) {
    typia.assert(session);
    // Validate session ID is valid UUID
    TestValidator.predicate(
      "session id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    // Validate session has seller information
    typia.assert(session.seller);
    TestValidator.equals(
      "seller email format valid",
      /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(
        session.seller.email,
      ),
      true,
    );
    // Validate seller approval status is valid
    const validStatuses = ["pending", "approved", "rejected"] as const;
    TestValidator.predicate(
      "seller approval status valid",
      validStatuses.includes(session.seller.approvalStatus),
    );
  }
  // 6. Validate pagination consistency
  const expectedPages = Math.ceil(
    sessions.pagination.records / sessions.pagination.limit,
  );
  TestValidator.equals(
    "pages calculated correctly",
    sessions.pagination.pages,
    expectedPages,
  );
  // 7. Validate sessions belong only to this seller (security isolation)
  const sellerSessions = sessions.data.filter(
    (session) => session.seller.id === joined.id,
  );
  TestValidator.equals(
    "all sessions belong to seller",
    sellerSessions.length,
    sessions.data.length,
  );
  // 8. Validate most recent session appears first (descending order by created_at)
  if (sessions.data.length >= 2) {
    const firstCreatedAt = new Date(sessions.data[0].created_at).getTime();
    const secondCreatedAt = new Date(sessions.data[1].created_at).getTime();
    TestValidator.equals(
      "sessions sorted by created_at descending",
      firstCreatedAt >= secondCreatedAt,
      true,
    );
  }
}
