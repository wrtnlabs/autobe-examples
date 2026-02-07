import { ICommunityMigrationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMigrationHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityMigrationHistoryCollector {
  export async function collect(props: {
    body: ICommunityMigrationHistory.ICreate;
    admin: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      version: "",
      patch_name: "",
      applied_at: new Date(),
      status: "applied",
      description: "Auto-generated migration record",
      checksum: null,
      duration_ms: null,
      rollback_script_hash: null,
      appliedBy: { connect: { id: props.admin.id } },
      targetVersion: undefined,
    } satisfies Prisma.community_migration_historiesCreateInput;
  }
}
