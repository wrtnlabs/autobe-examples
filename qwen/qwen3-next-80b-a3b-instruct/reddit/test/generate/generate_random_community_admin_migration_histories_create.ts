import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityMigrationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMigrationHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_migration_history } from "../prepare/prepare_random_community_migration_history";

export async function generate_random_community_admin_migration_histories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityMigrationHistory.ICreate> | undefined;
  },
): Promise<ICommunityMigrationHistory> {
  const prepared: ICommunityMigrationHistory.ICreate =
    prepare_random_community_migration_history(props.body);
  const result: ICommunityMigrationHistory =
    await api.functional.community.admin.migration_histories.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
