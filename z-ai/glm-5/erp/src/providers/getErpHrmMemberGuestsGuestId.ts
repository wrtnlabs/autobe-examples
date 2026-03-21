import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmGuestTransformer } from "../transformers/ErpHrmGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberGuestsGuestId(props: {
  member: MemberPayload;
  guestId: string & tags.Format<"uuid">;
}): Promise<IErpHrmGuest> {
  const guest = await MyGlobal.prisma.erp_hrm_guests.findUniqueOrThrow({
    where: { id: props.guestId },
    ...ErpHrmGuestTransformer.select(),
  });
  return await ErpHrmGuestTransformer.transform(guest);
}
