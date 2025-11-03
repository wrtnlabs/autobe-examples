import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardConfigUpdateArray } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfigUpdateArray";
import type { IDiscussionBoardConfigUpdateResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfigUpdateResponse";

export async function test_api_system_config_update_valid_batch(
  connection: api.IConnection,
) {
  // Generate a batch of valid configuration updates
  const configUpdates: IDiscussionBoardConfigUpdateArray = ArrayUtil.repeat(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    (index) => {
      return {
        key: `config_key_${RandomGenerator.alphaNumeric(10)}`,
        value: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<80000>
        >(),
      };
    },
  );

  // Execute the batch update
  const response: IDiscussionBoardConfigUpdateResponse =
    await api.functional.discussionBoard.system.config.update(connection, {
      body: configUpdates,
    });

  // Validate the response
  typia.assert(response);
  TestValidator.equals(
    "updated_count should be equal to number of updates sent",
    response.updated_count,
    configUpdates.length,
  );
}
