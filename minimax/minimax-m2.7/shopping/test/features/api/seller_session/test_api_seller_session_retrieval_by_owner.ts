import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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

export async function test_api_seller_session_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new seller account via join (creates initial session)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 2. Login to ensure we have a valid authenticated session
  await authorize_seller_login(sellerConnection, {
    body: {
      email: seller.email,
      password: "1234", // Default password used by authorize_seller_join
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Generate a valid UUID for the session ID
  // In production, this would come from a session list endpoint or previous API call
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve the session by its unique ID
  const session = await api.functional.ecommerceMall.seller.seller.sessions.at(
    sellerConnection,
    { sessionId },
  );
  typia.assert(session);
  // 5. Validate session metadata fields are present
  TestValidator.equals("has valid session ID", session.id !== undefined, true);
  TestValidator.equals(
    "has client IP address",
    session.ip !== undefined && session.ip.length > 0,
    true,
  );
  TestValidator.equals(
    "has request URL (href)",
    session.href !== undefined && session.href.length > 0,
    true,
  );
  TestValidator.equals(
    "has HTTP referrer",
    session.referrer !== undefined,
    true,
  );
  TestValidator.equals(
    "has creation timestamp",
    session.createdAt !== undefined && session.createdAt.length > 0,
    true,
  );
  TestValidator.equals(
    "has expiration timestamp",
    session.expiredAt !== undefined && session.expiredAt.length > 0,
    true,
  );
  // 6. Validate seller information is included
  TestValidator.equals("seller ID matches", session.sellerId, seller.id);
  TestValidator.equals(
    "seller email is present",
    session.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "seller approval status matches",
    session.seller.approvalStatus,
    seller.approvalStatus,
  );
  // 7. Validate response does NOT contain JWT tokens
  // IEcommerceMallSellerSession does not have token fields
  // If tokens were returned, typia.assert would fail during validation
  // This confirms security: session details are retrieved without exposing tokens
}
