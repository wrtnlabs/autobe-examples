import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoUserProfileSnapshotCollector {
  export async function collect(props: {
    body: IMultiUserTodoUserProfileSnapshot.ICreate;
    multiUserTodoMembers: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      display_name: props.body.display_name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: { connect: { id: props.multiUserTodoMembers.id } },
    } satisfies Prisma.multi_user_todo_user_profile_snapshotsCreateInput;
  }
}
