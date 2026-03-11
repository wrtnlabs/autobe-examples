import { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_status_enum_reference(
  input?: DeepPartial<IDiscussionBoardStatusEnumReference.ICreate>,
): IDiscussionBoardStatusEnumReference.ICreate {
  // Helper function to generate realistic database table names
  const createMockTableName = () => {
    const tables = [
      "sections",
      "articles",
      "article_attachments",
      "article_files",
      "article_images",
      "article_tags",
      "users",
      "user_profiles",
      "comments",
      "administrator_requests",
      "ban_records",
      "section_permissions",
    ] as const;
    return RandomGenerator.pick(tables);
  };
  // Helper function to generate realistic column names
  const createMockColumnName = () => {
    const columns = [
      "status",
      "article_status",
      "user_status",
      "section_status",
      "comment_status",
      "request_status",
      "ban_status",
      "publish_status",
      "review_status",
    ] as const;
    return RandomGenerator.pick(columns);
  };
  return {
    referenced_table: input?.referenced_table ?? createMockTableName(),
    referenced_column: input?.referenced_column ?? createMockColumnName(),
  };
}
