import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";
import { prepare_random_shopping_mall_audit_log } from "../../../prepare/prepare_random_shopping_mall_audit_log";
import { generate_random_shopping_mall_audit_logs_create } from "../../../generate/generate_random_shopping_mall_audit_logs_create";
export async function test_api_audit_event_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for audit event creation
  const auditConnection: api.IConnection = { host: connection.host };
  // Create audit event with proper DTO structure
  const auditEvent = await api.functional.shoppingMall.audit.logs.create(
    auditConnection,
    {
      body: {
        action: "user_login", // snake_case action
        target_entity_type: "user", // target entity type
      },
    },
  );
  // Validate the response structure with typia.assert since IShoppingMallAuditLog is a string type
  typia.assert<string>(auditEvent);
  // Since IShoppingMallAuditLog is just a string type, we cannot validate properties like action or target_entity_type
  // The audit event creation was successful based on the API call returning a valid string
  TestValidator.predicate(
    "audit event creation succeeded",
    auditEvent.length > 0,
  );
  // Note: The audit event structure is represented as a string type, so property validation is not possible
  // This reflects the actual API contract where IShoppingMallAuditLog is defined as string in the DTO
}
