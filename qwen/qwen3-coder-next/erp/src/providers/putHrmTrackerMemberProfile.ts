import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerMemberTransformer } from "../transformers/HrmTrackerMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTrackerMemberProfile(props: {
  member: MemberPayload;
  body: IHrmTrackerMember.IUpdate;
}): Promise<IHrmTrackerMember> {
  const current = await MyGlobal.prisma.hrm_tracker_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });
  if (current === null) {
    throw new HttpException("Forbidden", 403);
  }
  const data: Prisma.hrm_tracker_membersUpdateInput = {
    display_name: props.body.display_name,
    ...(props.body.avatar_url !== undefined && {
      avatar_url: props.body.avatar_url,
    }),
    ...(props.body.phone !== undefined && {
      phone: props.body.phone,
    }),
  };
  await MyGlobal.prisma.hrm_tracker_members.update({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    data,
  });
  const updated = await MyGlobal.prisma.hrm_tracker_members.findUniqueOrThrow({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    ...HrmTrackerMemberTransformer.select(),
  });
  return await HrmTrackerMemberTransformer.transform(updated);
}
