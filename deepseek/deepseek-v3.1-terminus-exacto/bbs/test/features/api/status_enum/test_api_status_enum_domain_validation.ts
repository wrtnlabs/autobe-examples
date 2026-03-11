import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_status_enums_create } from "../../../generate/generate_random_discussion_board_admin_status_enums_create";
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";

/**
 * Test that the system validates entity_type against expected domain categories.
 * Attempt to create status enumeration values with invalid entity_type values that
 * don't match the expected categories (article, comment, admin_request, user, ban, attachment).
 * Verify that the system rejects invalid entity_type values with appropriate error messages.
 * Test should also validate that sort_order must be a positive integer and that
 * required fields (entity_type, value, description) are properly validated.
 */
export async function test_api_status_enum_domain_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Create a valid status enumeration first to establish baseline
  const validStatus =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "article",
          value: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(validStatus);
  // Test 2: Invalid entity_type - random string
  await TestValidator.error(
    "invalid entity_type with random string",
    async () => {
      await generate_random_discussion_board_admin_status_enums_create(
        adminConnection,
        {
          body: {
            entity_type: RandomGenerator.alphabets(8),
            value: RandomGenerator.alphabets(10),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          } satisfies IDiscussionBoardStatusEnum.ICreate,
        },
      );
    },
  );
  // Test 3: Invalid entity_type - empty string
  await TestValidator.error(
    "invalid entity_type with empty string",
    async () => {
      await generate_random_discussion_board_admin_status_enums_create(
        adminConnection,
        {
          body: {
            entity_type: "",
            value: RandomGenerator.alphabets(10),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          } satisfies IDiscussionBoardStatusEnum.ICreate,
        },
      );
    },
  );
  // Test 4: Invalid entity_type - numeric string
  await TestValidator.error(
    "invalid entity_type with numeric string",
    async () => {
      await generate_random_discussion_board_admin_status_enums_create(
        adminConnection,
        {
          body: {
            entity_type: "12345",
            value: RandomGenerator.alphabets(10),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          } satisfies IDiscussionBoardStatusEnum.ICreate,
        },
      );
    },
  );
  // Test 5: Invalid sort_order - negative number
  await TestValidator.error(
    "invalid sort_order with negative number",
    async () => {
      await generate_random_discussion_board_admin_status_enums_create(
        adminConnection,
        {
          body: {
            entity_type: "article",
            value: RandomGenerator.alphabets(10),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Maximum<-1>
            >(),
          } satisfies IDiscussionBoardStatusEnum.ICreate,
        },
      );
    },
  );
  // Test 6: Invalid sort_order - zero
  await TestValidator.error("invalid sort_order with zero", async () => {
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "article",
          value: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: 0 satisfies number as number,
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  });
  // Test 7: Empty value field
  await TestValidator.error("empty value field", async () => {
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "article",
          value: "",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  });
  // Test 8: Empty description field
  await TestValidator.error("empty description field", async () => {
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "article",
          value: RandomGenerator.alphabets(10),
          description: "",
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  });
}
