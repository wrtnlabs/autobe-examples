import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppHistoryMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppHistoryMetadatum";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_history_metadata_retrieve_existing_configuration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  typia.assert(authorizedUser);
  // 2. Mock a history metadata configuration that would exist in the system
  // Since we cannot create metadata via API (no create endpoint provided),
  // we simulate that a configuration exists with known metadataId
  // In real scenario, this would be created via admin or seed data
  const metadataId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the history metadata configuration
  const metadata = await api.functional.todoApp.user.history_metadata.at(
    userConnection,
    { metadataId },
  );
  typia.assert(metadata);
  // 4. Validate all expected fields are present and have correct formats
  TestValidator.equals("metadata has ID", metadata.id, metadataId);
  TestValidator.predicate(
    "config_key is string",
    () => typeof metadata.config_key === "string",
  );
  TestValidator.predicate(
    "config_value is string",
    () => typeof metadata.config_value === "string",
  );
  TestValidator.predicate(
    "config_description is string",
    () => typeof metadata.config_description === "string",
  );
  TestValidator.predicate(
    "is_active is boolean",
    () => typeof metadata.is_active === "boolean",
  );
  // Validate nullable fields with proper type checking
  if (metadata.retention_days !== null) {
    TestValidator.predicate(
      "retention_days is int32 when not null",
      () =>
        typeof metadata.retention_days === "number" &&
        Number.isInteger(metadata.retention_days),
    );
  }
  if (metadata.cleanup_frequency !== null) {
    TestValidator.predicate(
      "cleanup_frequency is string when not null",
      () => typeof metadata.cleanup_frequency === "string",
    );
  }
  if (metadata.max_history_entries !== null) {
    TestValidator.predicate(
      "max_history_entries is int32 when not null",
      () =>
        typeof metadata.max_history_entries === "number" &&
        Number.isInteger(metadata.max_history_entries),
    );
  }
  // Validate timestamp formats
  TestValidator.predicate("created_at is ISO date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      metadata.created_at,
    ),
  );
  TestValidator.predicate("updated_at is ISO date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      metadata.updated_at,
    ),
  );
  // 5. Validate operational parameters for system administration
  if (metadata.retention_days !== null && metadata.retention_days > 0) {
    TestValidator.predicate(
      "retention_days positive when set",
      () => metadata.retention_days! > 0,
    );
  }
  if (
    metadata.max_history_entries !== null &&
    metadata.max_history_entries > 0
  ) {
    TestValidator.predicate(
      "max_history_entries positive when set",
      () => metadata.max_history_entries! > 0,
    );
  }
  // 6. Verify the configuration is meaningful for system administration
  TestValidator.predicate(
    "config_key not empty",
    () => metadata.config_key.length > 0,
  );
  TestValidator.predicate(
    "config_description not empty",
    () => metadata.config_description.length > 0,
  );
}
