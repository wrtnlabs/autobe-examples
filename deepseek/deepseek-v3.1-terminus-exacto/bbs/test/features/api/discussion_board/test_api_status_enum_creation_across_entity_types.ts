import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_status_enums_create } from "../../../generate/generate_random_discussion_board_super_admin_status_enums_create";
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";

export async function test_api_status_enum_creation_across_entity_types(
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
  // Define entity types to test
  const entityTypes = [
    "article",
    "comment",
    "admin_request",
    "user",
    "ban",
    "attachment",
  ] as const;
  // Create status enumerations for each entity type
  const createdStatusEnums: IDiscussionBoardStatusEnum[] = [];
  for (const entityType of entityTypes) {
    const statusEnum =
      await generate_random_discussion_board_super_admin_status_enums_create(
        superAdminConnection,
        {
          body: {
            entity_type: entityType,
            value: RandomGenerator.alphabets(8),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
          } satisfies IDiscussionBoardStatusEnum.ICreate,
        },
      );
    typia.assert(statusEnum);
    createdStatusEnums.push(statusEnum);
    // Validate the created status enum
    TestValidator.equals(
      `entity_type should be ${entityType}`,
      statusEnum.entity_type,
      entityType,
    );
  }
  // Test that same status value can exist across different entity types
  const commonStatusValue = "pending";
  // Create status with same value for different entity types
  const articlePending =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "article",
          value: commonStatusValue,
          description: "Article pending status",
          sort_order: 1,
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(articlePending);
  const commentPending =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "comment",
          value: commonStatusValue,
          description: "Comment pending status",
          sort_order: 1,
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(commentPending);
  // Verify same value exists across different entity types
  TestValidator.equals(
    "same status value for article",
    articlePending.value,
    commonStatusValue,
  );
  TestValidator.equals(
    "same status value for comment",
    commentPending.value,
    commonStatusValue,
  );
  TestValidator.notEquals(
    "different entity types",
    articlePending.entity_type,
    commentPending.entity_type,
  );
  // Validate all created status enums have unique IDs
  const statusIds = createdStatusEnums.map((status) => status.id);
  const uniqueIds = new Set(statusIds);
  TestValidator.equals(
    "all status enums should have unique IDs",
    uniqueIds.size,
    statusIds.length,
  );
  // Validate timestamp ordering
  for (const statusEnum of createdStatusEnums) {
    TestValidator.predicate(
      `created_at should be before updated_at for ${statusEnum.entity_type}`,
      new Date(statusEnum.created_at) <= new Date(statusEnum.updated_at),
    );
    TestValidator.equals(
      `deleted_at should be null for ${statusEnum.entity_type}`,
      statusEnum.deleted_at,
      null,
    );
  }
}
