import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test the successful retrieval of a customer session by sessionId.
 *
 * Steps:
 * 1. Register a new customer via /auth/customer/join.
 * 2. Use the provided access token connection to retrieve sessions.
 * 3. Verify the returned session is correct and contains valid data.
 */
export async function test_api_customer_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin = {};
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Retrieve sessions for the authenticated customer
  //    Since no API exists to list sessions, we must retrieve sessionId from the token claims
  // Extract sessionId from JWT access token payload (if possible)
  // Decoding JWT token payload base64 (standard JWT format: header.payload.signature)
  // Usually payload contains session id under a property like 'sid' or 'sessionId'
  // This must be assumed from token structure or obtained via a separate API (not given)
  // Because no details provided for token structure and no API to list sessions,
  // we will use the access token itself as sessionId if it matches UUID format,
  // otherwise generate a fresh UUID and expect failure (to adhere scenario on success,
  // we will assume token.access contains or equals sessionId)
  // Here, we will parse the access token payload to extract sessionId if possible
  function base64UrlDecode(str: string): string {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) {
      str += "=";
    }
    return Buffer.from(str, "base64").toString("utf-8");
  }
  let sessionId: (string & tags.Format<"uuid">) | undefined = undefined;
  try {
    const payloadPart = authorized.token.access.split(".")[1];
    const payloadJson = base64UrlDecode(payloadPart);
    const payload = JSON.parse(payloadJson);
    if (typeof payload.sid === "string") {
      sessionId = payload.sid as string & tags.Format<"uuid">;
    } else if (typeof payload.sessionId === "string") {
      sessionId = payload.sessionId as string & tags.Format<"uuid">;
    }
  } catch {
    // fallback: no sessionId extracted
  }
  // If no sessionId extracted, fallback to token.access if it matches UUID format
  if (!sessionId) {
    // Using regex for UUID v4 format validation
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidV4Regex.test(authorized.token.access)) {
      sessionId = authorized.token.access as string & tags.Format<"uuid">;
    }
  }
  // If still no valid session ID, throw error (cannot continue scenario)
  if (!sessionId) {
    throw new Error(
      "Cannot extract valid sessionId from token access payload.",
    );
  }
  // 3. Call GET /shoppingMall/customer/sessions/{sessionId}
  const session = await api.functional.shoppingMall.customer.sessions.at(
    customerConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // Note: The properties validated in the original code do not exist in IShoppingMallCustomerSession type,
  // so we cannot validate them here. We only ensure the response is asserted by typia.
}
