import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { ErpHrmTimeMemberTransformer } from "../transformers/ErpHrmTimeMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeGuestProfile(props: {
  guest: GuestPayload;
  body: IErpHrmTimeMember.IUpdate;
}): Promise<IErpHrmTimeMember> {
  await MyGlobal.prisma.erp_hrm_time_members.findUniqueOrThrow({
    where: { id: props.guest.id },
    select: { id: true },
  });
  await MyGlobal.prisma.erp_hrm_time_members.update({
    where: { id: props.guest.id },
    data: {
      ...(props.body.displayName !== undefined
        ? { display_name: props.body.displayName }
        : {}),
      ...(props.body.avatarImageUrl !== undefined
        ? { avatar_image_url: props.body.avatarImageUrl }
        : {}),
      ...(props.body.phoneNumber !== undefined
        ? { phone_number: props.body.phoneNumber }
        : {}),
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.erp_hrm_time_members.findUniqueOrThrow({
    where: { id: props.guest.id },
    ...ErpHrmTimeMemberTransformer.select(),
  });
  return await ErpHrmTimeMemberTransformer.transform(updated);
}
