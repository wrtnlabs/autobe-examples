import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
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

export async function patchMultiUserTodoMemberProfileSnapshots(props: {
  member: MemberPayload;
  body: IMultiUserTodoUserProfileSnapshot.IUpdate;
}): Promise<IMultiUserTodoUserProfile> {
  const memberId = props.member.id;
  const displayNameToSet =
    props.body.restore_snapshot_id == null
      ? props.body.display_name
      : undefined;
  if (props.body.restore_snapshot_id == null) {
    if (displayNameToSet === undefined) {
      throw new HttpException("display_name is required", 400);
    }
  }
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    const current =
      await prisma.multi_user_todo_user_profiles.findUniqueOrThrow({
        where: { multi_user_todo_member_id: memberId },
        select: {
          id: true,
          display_name: true,
          multi_user_todo_member_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
    const restoreId = props.body.restore_snapshot_id;
    if (restoreId != null) {
      const snapshot =
        await prisma.multi_user_todo_user_profile_snapshots.findUniqueOrThrow({
          where: { id: restoreId },
          select: {
            id: true,
            display_name: true,
            multi_user_todo_member_id: true,
            deleted_at: true,
            created_at: true,
            updated_at: true,
          },
        });
      if (snapshot.multi_user_todo_member_id !== memberId) {
        throw new HttpException("Forbidden", 403);
      }
      if (snapshot.deleted_at != null) {
        throw new HttpException("Snapshot is not restorable", 400);
      }
      await prisma.multi_user_todo_user_profile_snapshots.create({
        data: {
          id: v4() as any,
          multi_user_todo_member_id: memberId,
          display_name: current.display_name,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
      await prisma.multi_user_todo_user_profiles.update({
        where: { multi_user_todo_member_id: memberId },
        data: {
          display_name: snapshot.display_name,
          updated_at: new Date(),
        },
      });
    } else {
      await prisma.multi_user_todo_user_profile_snapshots.create({
        data: {
          id: v4() as any,
          multi_user_todo_member_id: memberId,
          display_name: current.display_name,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
      await prisma.multi_user_todo_user_profiles.update({
        where: { multi_user_todo_member_id: memberId },
        data: {
          display_name: displayNameToSet,
          updated_at: new Date(),
        },
      });
    }
    const updated =
      await prisma.multi_user_todo_user_profiles.findUniqueOrThrow({
        where: { multi_user_todo_member_id: memberId },
        select: {
          id: true,
          display_name: true,
          multi_user_todo_member_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
    return {
      id: updated.id,
      displayName: updated.display_name,
      memberId: updated.multi_user_todo_member_id,
      createdAt: updated.created_at.toISOString(),
      updatedAt: updated.updated_at.toISOString(),
      deletedAt: updated.deleted_at?.toISOString() ?? null,
    };
  });
  return result;
}
