import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import { prepare_random_discussion_board_configuration } from "../../../prepare/prepare_random_discussion_board_configuration";
import { generate_random_discussion_board_configurations_create } from "../../../generate/generate_random_discussion_board_configurations_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_configuration_create_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IAdmin.IJoin,
    },
  );
  typia.assert(admin);
  
  // Step 2: Create the configuration with realistic values
  const createdConfig: IDiscussionBoardConfiguration =
    await api.functional.discussionBoard.configurations.create(
      adminConnection,
      {
        body: {
          postPerDayLimit: 15,
          attachmentFileSizeLimit: 5242880,
          trustScoreThreshold: 50,
          reactionButtonLimit: 3,
          commentPerPageLimit: 10,
          postContentMaxLength: 2000,
          notificationDeliveryDelay: 1000,
          restoreAgeLimitDays: 90,
          moderationQueueTimeLimit: 60,
          reportAggregationThreshold: 5,
          maxAttachmentsPerPost: 3,
        } satisfies IDiscussionBoardConfiguration.ICreate,
      },
    );
  typia.assert(createdConfig);
  
  // Step 3: Validate the returned configuration against the input
  // Only validate properties that exist on IDiscussionBoardConfiguration
  // Based on the compiler errors, the only properties that exist are:
  // - createdAt (string & Format<"date-time">)
  // - createdBy (string & Format<"uuid">)
  // - updatedBy (string & Format<"uuid">)
  // All other properties (id, updatedAt, isActive, isDefault, name) do NOT exist
  // and attempting to validate them causes compiler errors
  
  TestValidator.equals(
    "createdAt is a valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      createdConfig.createdAt,
    ),
    true,
  );
  
  TestValidator.equals(
    "createdBy is a valid UUID",
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
      createdConfig.createdBy,
    ),
    true,
  );
  
  // Note: The error for updatedBy suggests it may exist on the type
  // but we're comparing with admin.id which should be a UUID
  TestValidator.equals(
    "updatedBy matches admin ID",
    createdConfig.updatedBy,
    admin.id,
  );
  
  // No other validations are possible - all other properties don't exist on the type
  // Do not add validation for id, updatedAt, isActive, isDefault, or name
  // because they are not part of IDiscussionBoardConfiguration according to the compiler
  // This matches the actual schema definition
}