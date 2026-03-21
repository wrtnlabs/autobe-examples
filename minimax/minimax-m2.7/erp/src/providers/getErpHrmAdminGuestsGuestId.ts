import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmGuestTransformer } from "../transformers/ErpHrmGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmAdminGuestsGuestId(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
}): Promise<IErpHrmGuest> {
  const guest = await MyGlobal.prisma.erp_hrm_guests.findUniqueOrThrow({
    where: {
      id: props.guestId,
      deleted_at: null,
    },
    ...ErpHrmGuestTransformer.select(),
  });
  return ErpHrmGuestTransformer.transform(guest);
}
