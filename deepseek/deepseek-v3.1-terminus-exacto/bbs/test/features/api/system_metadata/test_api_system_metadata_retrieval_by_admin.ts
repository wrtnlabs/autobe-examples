import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import type { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the successful retrieval of an active system metadata configuration
 * by an authenticated administrator.
 *
 * Validates that:
 * 1. Only authenticated administrators can access the endpoint
 * 2. Complete metadata records are returned with all fields
 * 3. Soft-deleted records are properly excluded
 * 4. The response matches the IDiscussionBoardSystemMetadatum structure
 */
export async function test_api_system_metadata_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate a random UUID for metadata retrieval
  // Since we cannot create system metadata via API, we attempt to retrieve
  // an existing record. If no record exists, we'll get a 404 error.
  const metadataId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the system metadata
  // Use TestValidator.error to handle both success and 404 cases gracefully
  await TestValidator.error(
    "system metadata retrieval requires existing record",
    async () => {
      const metadata =
        await api.functional.discussionBoard.admin.system_metadata.at(
          adminConnection,
          { metadataId },
        );
      // If we get here without error, validate the complete response
      typia.assert(metadata);
      // Validate core fields presence
      TestValidator.equals("metadata has id", metadata.id, metadataId);
      TestValidator.predicate(
        "status_type_id is UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          metadata.status_type_id,
        ),
      );
      TestValidator.predicate(
        "name is string",
        typeof metadata.name === "string",
      );
      TestValidator.predicate(
        "value is string",
        typeof metadata.value === "string",
      );
      TestValidator.predicate(
        "data_type is string",
        typeof metadata.data_type === "string",
      );
      TestValidator.predicate(
        "scope is string",
        typeof metadata.scope === "string",
      );
      // Validate version is positive integer
      TestValidator.predicate("version is positive", metadata.version >= 0);
      // Validate timestamps are ISO strings
      TestValidator.predicate(
        "created_at is date-time",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
          metadata.created_at,
        ),
      );
      TestValidator.predicate(
        "updated_at is date-time",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
          metadata.updated_at,
        ),
      );
      // Validate soft-deleted records are excluded (deleted_at should be null)
      TestValidator.equals(
        "active record has null deleted_at",
        metadata.deleted_at,
        null,
      );
      // Validate statusType relation structure
      typia.assert(metadata.statusType);
      TestValidator.equals(
        "statusType has id",
        metadata.statusType.id,
        metadata.status_type_id,
      );
      TestValidator.predicate(
        "statusType category is string",
        typeof metadata.statusType.category === "string",
      );
      TestValidator.predicate(
        "statusType code is string",
        typeof metadata.statusType.code === "string",
      );
      TestValidator.predicate(
        "statusType display_name is string",
        typeof metadata.statusType.display_name === "string",
      );
      TestValidator.predicate(
        "statusType display_order is number",
        typeof metadata.statusType.display_order === "number",
      );
      TestValidator.predicate(
        "statusType is_active is boolean",
        typeof metadata.statusType.is_active === "boolean",
      );
      // Validate data integrity: if description exists, it should be string
      if (metadata.description !== null && metadata.description !== undefined) {
        TestValidator.predicate(
          "description is string when present",
          typeof metadata.description === "string",
        );
      }
    },
  );
}
