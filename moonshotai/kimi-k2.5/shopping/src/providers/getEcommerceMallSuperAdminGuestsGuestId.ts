import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallGuestTransformer } from "../transformers/EcommerceMallGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdminGuestsGuestId(props: {
  superAdmin: SuperadminPayload;
  guestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallGuest> {
  const guest = await MyGlobal.prisma.ecommerce_mall_guests.findUniqueOrThrow({
    where: { id: props.guestId },
    ...EcommerceMallGuestTransformer.select(),
  });
  return await EcommerceMallGuestTransformer.transform(guest);
}
