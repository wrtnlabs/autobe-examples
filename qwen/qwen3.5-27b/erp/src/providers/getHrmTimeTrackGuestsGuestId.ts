import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackGuest";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackGuestTransformer } from "../transformers/HrmTimeTrackGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackGuest> {
  const record = await MyGlobal.prisma.hrm_time_track_guests.findUniqueOrThrow({
    ...HrmTimeTrackGuestTransformer.select(),
    where: {
      id: props.guestId,
      deleted_at: null,
    },
  });
  return await HrmTimeTrackGuestTransformer.transform(record);
}
