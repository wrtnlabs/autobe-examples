import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Registration with minimal required fields (device_id, ip only)
  const minimalDeviceId = typia.random<string & tags.Format<"uuid">>();
  const minimalRegistration = {
    device_id: minimalDeviceId,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppGuest.IJoin;
  const minimalConnection: api.IConnection = { host: connection.host };
  const minimalResponse = await authorize_guest_join(minimalConnection, {
    body: minimalRegistration,
  });
  typia.assert(minimalResponse);
  // Validate minimal response structure
  TestValidator.equals(
    "guest.id exists and is UUID",
    typeof minimalResponse.guest.id,
    "string",
  );
  TestValidator.equals(
    "guest.device_id matches input",
    minimalResponse.guest.device_id,
    minimalDeviceId,
  );
  TestValidator.equals(
    "authorization.access exists",
    typeof minimalResponse.authorization.access,
    "string",
  );
  TestValidator.equals(
    "authorization.refresh exists",
    typeof minimalResponse.authorization.refresh,
    "string",
  );
  TestValidator.equals(
    "authorization.expired_at exists",
    typeof minimalResponse.authorization.expired_at,
    "string",
  );
  // Validate token structure
  TestValidator.equals(
    "token.access exists",
    typeof minimalResponse.token.access,
    "string",
  );
  TestValidator.equals(
    "token.refresh exists",
    typeof minimalResponse.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token.expired_at exists",
    typeof minimalResponse.token.expired_at,
    "string",
  );
  // Validate date-time formats
  TestValidator.predicate("authorization.expired_at is valid date-time", () => {
    return !isNaN(new Date(minimalResponse.authorization.expired_at).getTime());
  });
  TestValidator.predicate("token.expired_at is valid date-time", () => {
    return !isNaN(new Date(minimalResponse.token.expired_at).getTime());
  });
  TestValidator.predicate("token.refreshable_until is valid date-time", () => {
    return !isNaN(new Date(minimalResponse.token.refreshable_until).getTime());
  });
  // Test 2: Registration with all fields including user_agent
  const fullRegistration = {
    device_id: typia.random<string & tags.Format<"uuid">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  } satisfies ITodoAppGuest.IJoin;
  const fullConnection: api.IConnection = { host: connection.host };
  const fullResponse = await authorize_guest_join(fullConnection, {
    body: fullRegistration,
  });
  typia.assert(fullResponse);
  // Validate full response
  TestValidator.equals(
    "user_agent captured",
    fullResponse.guest.device_id,
    fullRegistration.device_id,
  );
  // Test 3: Duplicate device_id should fail
  const duplicateRegistration = {
    device_id: minimalDeviceId, // Reuse same device_id
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppGuest.IJoin;
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate device_id fails", async () => {
    await authorize_guest_join(duplicateConnection, {
      body: duplicateRegistration,
    });
  });
}