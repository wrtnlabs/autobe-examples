import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberProfileSnapshotsSnapshotId(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoUserProfileSnapshot> {
  const snapshot =
    await MyGlobal.prisma.multi_user_todo_user_profile_snapshots.findFirst({
      where: {
        id: props.snapshotId,
        multi_user_todo_member_id: props.member.id,
      },
      select: {
        id: true,
        multi_user_todo_member_id: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (snapshot === null) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: snapshot.id,
    multi_user_todo_member_id: snapshot.multi_user_todo_member_id,
    display_name: snapshot.display_name,
    created_at: toISOStringSafe(snapshot.created_at) satisfies string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(snapshot.updated_at) satisfies string &
      tags.Format<"date-time">,
    deleted_at:
      snapshot.deleted_at === null
        ? null
        : (toISOStringSafe(snapshot.deleted_at) satisfies string &
            tags.Format<"date-time">),
  };
}
