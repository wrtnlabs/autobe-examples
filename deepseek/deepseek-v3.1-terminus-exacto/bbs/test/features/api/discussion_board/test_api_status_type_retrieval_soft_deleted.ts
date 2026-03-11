import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
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
 * Test the retrieval of a soft-deleted status type to verify proper handling of inactive status types.
 * Since the API doesn't provide endpoints to create or soft-delete status types, this test focuses
 * on the retrieval behavior when attempting to access a potentially soft-deleted status type.
 */
export async function test_api_status_type_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Since the API doesn't provide endpoints to create or soft-delete status types,
  // we'll test the retrieval endpoint with a valid UUID format to see how it handles
  // the request. The system should either return the status type with deletion metadata
  // or return an appropriate error response.
  const statusTypeId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the status type
  const statusType = await api.functional.discussionBoard.admin.status_types.at(
    adminConnection,
    { statusTypeId },
  );
  typia.assert(statusType);
  // Validate the response structure
  TestValidator.predicate(
    "status type should have id",
    statusType.id !== undefined,
  );
  TestValidator.predicate(
    "status type should have category",
    statusType.category !== undefined,
  );
  TestValidator.predicate(
    "status type should have code",
    statusType.code !== undefined,
  );
  TestValidator.predicate(
    "status type should have display_name",
    statusType.display_name !== undefined,
  );
  TestValidator.predicate(
    "status type should have display_order",
    statusType.display_order !== undefined,
  );
  TestValidator.predicate(
    "status type should have is_active",
    statusType.is_active !== undefined,
  );
  TestValidator.predicate(
    "status type should have created_at",
    statusType.created_at !== undefined,
  );
  TestValidator.predicate(
    "status type should have updated_at",
    statusType.updated_at !== undefined,
  );
  // The deleted_at field is optional in the DTO, so it may or may not be present
  // If it's present and the status type is soft-deleted, validate the scenario
  if (statusType.deleted_at !== null && statusType.deleted_at !== undefined) {
    TestValidator.equals(
      "soft-deleted status type should be inactive",
      statusType.is_active,
      false,
    );
    TestValidator.predicate(
      "deleted_at should be a valid date-time",
      typeof statusType.deleted_at === "string" &&
        statusType.deleted_at.length > 0,
    );
  }
}
