import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoUserProfileSnapshotCollector } from "../collectors/MultiUserTodoUserProfileSnapshotCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoUserProfileSnapshotTransformer } from "../transformers/MultiUserTodoUserProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoMemberProfileSnapshots(props: {
  member: MemberPayload;
  body: IMultiUserTodoUserProfileSnapshot.ICreate;
}): Promise<IMultiUserTodoUserProfileSnapshot> {
  const member = await MyGlobal.prisma.multi_user_todo_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (member === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const snapshot = await tx.multi_user_todo_user_profile_snapshots.create({
      data: await MultiUserTodoUserProfileSnapshotCollector.collect({
        body: props.body,
        multiUserTodoMembers: member,
      }),
      select: MultiUserTodoUserProfileSnapshotTransformer.select().select,
    });
    const fresh =
      await tx.multi_user_todo_user_profile_snapshots.findUniqueOrThrow({
        where: { id: snapshot.id },
        ...MultiUserTodoUserProfileSnapshotTransformer.select(),
      });
    return fresh;
  });
  return await MultiUserTodoUserProfileSnapshotTransformer.transform(created);
}
