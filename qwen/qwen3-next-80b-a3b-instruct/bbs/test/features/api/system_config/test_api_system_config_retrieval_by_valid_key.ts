import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfig";

export async function test_api_system_config_retrieval_by_valid_key(
  connection: api.IConnection,
) {
  const key = RandomGenerator.pick([
    "max_file_size_per_post_mb",
    "allowed_image_types",
    "min_post_title_length",
    "max_comment_length",
    "min_reply_time_interval",
    "enable_threaded_replies",
    "auto_close_threads_after_days",
  ] as const);
  const config: IDiscussionBoardConfig =
    await api.functional.discussionBoard.system.config.at(connection, {
      key,
    });
  typia.assert(config);
  TestValidator.equals("config key matches requested key", config.key, key);
  TestValidator.predicate(
    "config value is non-empty",
    config.value.length >= 1,
  );
  TestValidator.predicate(
    "config description is non-empty",
    config.description.length >= 1,
  );
  TestValidator.predicate(
    "config category is non-empty",
    config.category.length >= 1,
  );
}
