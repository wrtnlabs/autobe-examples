import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_session_metadata_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account via join endpoint
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Use the connection that was updated by authorize_seller_join
  // The connection's Authorization header is now set with the seller's token
  const sessionConnection: api.IConnection = { host: connection.host };
  sessionConnection.headers = joinConnection.headers;
  // 3. Get session by ID
  const session = await api.functional.ecommerceMall.seller.sessions.at(
    sessionConnection,
    {
      sessionId: joinResponse.id,
    },
  );
  typia.assert(session);
  // 4. Validate session metadata
  TestValidator.equals(
    "session ID matches seller ID",
    session.id,
    joinResponse.id,
  );
  // 5. Validate seller relationship object
  TestValidator.equals(
    "seller email matches join email",
    session.seller.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "seller approval status is approved",
    session.seller.approvalStatus,
    "approved",
  );
  TestValidator.equals(
    "seller is not suspended",
    session.seller.isSuspended,
    false,
  );
  TestValidator.equals("seller is not banned", session.seller.isBanned, false);
  // 6. Validate IP address is present
  TestValidator.equals("IP address is present", session.ip !== "", true);
  // 7. Validate timestamps are valid ISO 8601 format
  const createdAt = new Date(session.created_at);
  const expiredAt = new Date(session.expired_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredAt.getTime()),
  );
  // 8. Validate session duration (expired_at should be after created_at)
  TestValidator.predicate(
    "expired_at is after created_at",
    expiredAt > createdAt,
  );
  // 9. Validate href is present
  TestValidator.equals("href is present", session.href !== "", true);
  // 10. Validate referrer is present (can be empty string)
  TestValidator.equals("referrer is present", session.referrer !== "", true);
}
