import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test retrieving a specific super administrator session by its unique identifier.
 *
 * Validates the session retrieval endpoint for super administrators. This test verifies that an authenticated super administrator can successfully retrieve their own session details using the session ID obtained during authentication. The response includes complete session metadata such as client IP address, request paths, HTTP referrer, and timestamps, along with the embedded super administrator account summary.
 *
 * **Authentication Flow**:
 * - A super admin account is registered through the join endpoint
 * - JWT access token is extracted from the authorization response
 * - The session ID is obtained from the authorization response (authorized.id)
 * - Session details are retrieved via the dedicated session endpoint
 *
 * **Response Validation**:
 * - Session record contains all required metadata fields (id, ip, href, referrer, createdAt, expiredAt)
 * - Embedded superAdmin summary contains account information (id, email, createdAt, updatedAt, isDeleted)
 * - All datetime values conform to ISO 8601 format
 *
 * 1. Register new super administrator via join endpoint.
 * 2. Extract sessionId and access token from authorization response.
 * 3. Create authenticated connection with JWT access token.
 * 4. Call session retrieval endpoint with sessionId.
 * 5. Validate session response matches authenticated user and contains valid metadata.
 */
export async function test_api_super_admin_session_retrieval_own_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator account
  const authorized = await authorize_super_admin_join(connection, {});
  // 2. Extract sessionId from authorization response
  const sessionId = authorized.id;
  // 3. Create authenticated connection with JWT access token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 4. Call the session retrieval endpoint
  const session =
    await api.functional.ecommerceMall.superAdmin.super_admin.sessions.at(
      authenticatedConnection,
      {
        sessionId: sessionId,
      },
    );
  typia.assert(session);
  // 5. Validate session belongs to the authenticated super administrator
  TestValidator.equals(
    "session id matches authorized id",
    session.id,
    authorized.id,
  );
  TestValidator.equals(
    "session superAdmin.id matches authorized id",
    session.superAdmin.id,
    authorized.id,
  );
  TestValidator.equals(
    "session superAdmin.email matches authorized email",
    session.superAdmin.email,
    authorized.email,
  );
  TestValidator.equals(
    "session superAdmin.isDeleted is false",
    session.superAdmin.isDeleted,
    false,
  );
}
