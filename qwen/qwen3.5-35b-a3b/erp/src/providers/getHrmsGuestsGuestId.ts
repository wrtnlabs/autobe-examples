import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmsGuestTransformer } from "../transformers/HrmsGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getHrmsGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IHrmsGuest> {
  const guest = await MyGlobal.prisma.hrms_guests.findUniqueOrThrow({
    where: { id: props.guestId },
    ...HrmsGuestTransformer.select(),
  });
  return await HrmsGuestTransformer.transform(guest);
}
