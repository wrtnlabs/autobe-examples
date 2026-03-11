import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_metadata_create } from "../../../generate/generate_random_discussion_board_super_admin_system_metadata_create";
import { prepare_random_discussion_board_system_metadatum } from "../../../prepare/prepare_random_discussion_board_system_metadatum";

export async function test_api_system_metadata_retrieval_with_deleted_record(
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
  // Test different data types for comprehensive coverage
  const dataTypes = ["boolean", "integer", "string", "json", "float"] as const;
  for (const dataType of dataTypes) {
    // Generate appropriate value based on data type
    let value: string;
    switch (dataType) {
      case "boolean":
        value = typia.random<boolean>().toString();
        break;
      case "integer":
        value = typia
          .random<number & tags.Type<"int32"> & tags.Minimum<0>>()
          .toString();
        break;
      case "float":
        value = typia
          .random<number & tags.Minimum<0> & tags.Maximum<1000>>()
          .toFixed(2);
        break;
      case "json":
        value = JSON.stringify({
          test: RandomGenerator.alphabets(5),
          number: typia.random<number & tags.Type<"int32">>(),
          active: typia.random<boolean>(),
        });
        break;
      default: // string
        value = RandomGenerator.alphabets(10);
        break;
    }
    // Create system metadata configuration using utility function
    const metadata =
      await generate_random_discussion_board_super_admin_system_metadata_create(
        superAdminConnection,
        {
          body: {
            name: `test_config_${dataType}_${RandomGenerator.alphabets(5)}`,
            value: value,
            data_type: dataType,
            scope: "global",
            description: `Test configuration for ${dataType} data type`,
          } satisfies IDiscussionBoardSystemMetadatum.ICreate,
        },
      );
    typia.assert(metadata);
    // Verify the record exists and can be retrieved
    const existingRecord =
      await api.functional.discussionBoard.superAdmin.system_metadata.at(
        superAdminConnection,
        { metadataId: metadata.id },
      );
    typia.assert(existingRecord);
    TestValidator.equals(
      "record exists before deletion",
      existingRecord.id,
      metadata.id,
    );
    // Soft-delete the record
    await api.functional.discussionBoard.superAdmin.system_metadata.erase(
      superAdminConnection,
      { metadataId: metadata.id },
    );
    // Attempt to retrieve the deleted record and verify it returns 404
    await TestValidator.httpError(
      `retrieval should fail for deleted ${dataType} record`,
      404,
      async () => {
        await api.functional.discussionBoard.superAdmin.system_metadata.at(
          superAdminConnection,
          { metadataId: metadata.id },
        );
      },
    );
  }
}
