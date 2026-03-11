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

export async function test_api_status_enum_retrieval_existing_active(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator account for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Create authenticated connection with the authorized super admin
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedSuperAdmin.token.access },
  };
  // Create a status enumeration to retrieve
  const createBody = {
    entity_type: "article",
    value: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    // sort_order is optional, let it default
  } satisfies IDiscussionBoardStatusEnum.ICreate;
  const createdStatusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      authenticatedConnection,
      {
        body: createBody,
      },
    );
  typia.assert(createdStatusEnum);
  // Retrieve the created status enum by its ID
  const retrievedStatusEnum =
    await api.functional.discussionBoard.superAdmin.status_enums.at(
      authenticatedConnection,
      {
        statusEnumId: createdStatusEnum.id,
      },
    );
  typia.assert(retrievedStatusEnum);
  // Validate that all fields match the creation request
  TestValidator.equals(
    "entity_type matches",
    retrievedStatusEnum.entity_type,
    createBody.entity_type,
  );
  TestValidator.equals(
    "value matches",
    retrievedStatusEnum.value,
    createBody.value,
  );
  TestValidator.equals(
    "description matches",
    retrievedStatusEnum.description,
    createBody.description,
  );
  // Validate system-generated fields
  TestValidator.equals(
    "id matches",
    retrievedStatusEnum.id,
    createdStatusEnum.id,
  );
  TestValidator.predicate(
    "is_active is true",
    retrievedStatusEnum.is_active === true,
  );
  TestValidator.predicate(
    "sort_order is positive integer",
    retrievedStatusEnum.sort_order > 0 &&
      Number.isInteger(retrievedStatusEnum.sort_order),
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedStatusEnum.deleted_at,
    null,
  );
  // Validate timestamp fields are properly populated with ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedStatusEnum.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedStatusEnum.updated_at,
    ),
  );
}
