import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteMultiUserTodoMemberProfilesProfileId(props: {
  member: MemberPayload;
  profileId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const profile = await tx.multi_user_todo_user_profiles.findFirst({
      where: {
        id: props.profileId,
        multi_user_todo_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (profile === null) {
      throw new HttpException("Forbidden", 403);
    }
    await tx.multi_user_todo_user_profiles.delete({
      where: {
        id: profile.id,
      },
    });
  });
}
