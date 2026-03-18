import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformMemberTransformer } from "../transformers/HrmPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMembersMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformMember> {
  const member = await MyGlobal.prisma.hrm_platform_members.findUniqueOrThrow({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
    ...HrmPlatformMemberTransformer.select(),
  });
  return await HrmPlatformMemberTransformer.transform(member);
}
