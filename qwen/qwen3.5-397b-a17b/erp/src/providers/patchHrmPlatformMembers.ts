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

export async function patchHrmPlatformMembers(props: {
  body: IHrmPlatformMember.IUpdate;
}): Promise<IHrmPlatformMember> {
  const memberId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  const updated = await MyGlobal.prisma.hrm_platform_members.update({
    where: {
      id: memberId,
    },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.avatar_url !== undefined && {
        avatar_url: props.body.avatar_url,
      }),
      ...(props.body.phone_number !== undefined && {
        phone_number: props.body.phone_number,
      }),
      updated_at: new Date(),
    },
    ...HrmPlatformMemberTransformer.select(),
  });
  return await HrmPlatformMemberTransformer.transform(updated);
}
