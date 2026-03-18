import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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

export async function putShoppingMallMemberProfile(props: {
  member: MemberPayload;
  body: IShoppingMallMember.IUpdate;
}): Promise<IShoppingMallMember> {
  const member = await MyGlobal.prisma.shopping_mall_members.findUnique({
    where: { id: props.member.id },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (member === null || member.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.email !== undefined) {
    await MyGlobal.prisma.shopping_mall_members.update({
      where: { id: props.member.id },
      data: {
        email: props.body.email,
        updated_at: { set: member.updated_at },
      },
    });
  }
  const updated = await MyGlobal.prisma.shopping_mall_members.findUniqueOrThrow(
    {
      where: { id: props.member.id },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  return {
    id: updated.id as string & tags.Format<"uuid">,
    email: updated.email as string & tags.Format<"email">,
    created_at: updated.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: updated.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: updated.deleted_at?.toISOString() ?? null,
  };
}
