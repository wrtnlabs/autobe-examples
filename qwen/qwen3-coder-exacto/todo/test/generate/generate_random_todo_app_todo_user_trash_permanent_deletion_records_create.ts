import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppPermanentDeletionRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppPermanentDeletionRecord";
import { prepare_random_todo_app_permanent_deletion_record } from "../prepare/prepare_random_todo_app_permanent_deletion_record";
export async function generate_random_todo_app_todo_user_trash_permanent_deletion_records_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppPermanentDeletionRecord.ICreate>;
  },
): Promise<ITodoAppPermanentDeletionRecord> {
  const prepared = prepare_random_todo_app_permanent_deletion_record(
    props.body,
  );
  const result =
    await api.functional.todoApp.todoUser.trash.permanent_deletion_records.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
