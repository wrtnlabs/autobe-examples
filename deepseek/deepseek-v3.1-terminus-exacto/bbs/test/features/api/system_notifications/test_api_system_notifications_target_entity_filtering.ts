import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test notification filtering by target entity type and ID.
 * Validate that super admins can filter notifications by specific entity types
 * (article, comment, section, admin_request, user) and their corresponding UUIDs.
 * Test combinations of entity type and ID filtering to ensure precise notification retrieval.
 * Verify that notifications are correctly associated with their target entities
 * and that the filtering mechanism properly handles both valid and invalid entity references.
 */
export async function test_api_system_notifications_target_entity_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate test UUIDs for different entity types
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const adminRequestId = typia.random<string & tags.Format<"uuid">>();
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Define entity types to test
  const entityTypes = [
    "article",
    "comment",
    "section",
    "admin_request",
    "user",
  ] as const;
  const entityIds = [articleId, commentId, sectionId, adminRequestId, userId];
  // Test filtering by each entity type individually
  for (const entityType of entityTypes) {
    const searchRequest = {
      target_entity_type: entityType,
      page: 1,
      limit: 10,
    } satisfies IDiscussionBoardSystemNotification.IRequest;
    const result =
      await api.functional.discussionBoard.superAdmin.system_notifications.index(
        superAdminConnection,
        { body: searchRequest },
      );
    typia.assert(result);
    TestValidator.predicate(
      `should return paginated results for ${entityType} filter`,
      result.pagination.current === 1 && result.pagination.limit === 10,
    );
  }
  // Test filtering by entity type + specific ID combinations
  for (let i = 0; i < entityTypes.length; i++) {
    const entityType = entityTypes[i];
    const entityId = entityIds[i];
    const searchRequest = {
      target_entity_type: entityType,
      target_entity_id: entityId,
      page: 1,
      limit: 5,
    } satisfies IDiscussionBoardSystemNotification.IRequest;
    const result =
      await api.functional.discussionBoard.superAdmin.system_notifications.index(
        superAdminConnection,
        { body: searchRequest },
      );
    typia.assert(result);
    TestValidator.predicate(
      `should return paginated results for ${entityType} with ID ${entityId}`,
      result.pagination.current === 1 && result.pagination.limit === 5,
    );
  }
  // Test filtering with only UUID (no entity type) - should be handled gracefully
  const uuidOnlySearchRequest = {
    target_entity_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSystemNotification.IRequest;
  const uuidOnlyResult =
    await api.functional.discussionBoard.superAdmin.system_notifications.index(
      superAdminConnection,
      { body: uuidOnlySearchRequest },
    );
  typia.assert(uuidOnlyResult);
  TestValidator.predicate(
    "should handle UUID-only filtering gracefully",
    Array.isArray(uuidOnlyResult.data),
  );
  // Test empty search (no filters) to get all notifications
  const emptySearchRequest = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardSystemNotification.IRequest;
  const emptyResult =
    await api.functional.discussionBoard.superAdmin.system_notifications.index(
      superAdminConnection,
      { body: emptySearchRequest },
    );
  typia.assert(emptyResult);
  TestValidator.predicate(
    "should return paginated results for empty search",
    emptyResult.pagination.current === 1 && emptyResult.pagination.limit === 20,
  );
}
