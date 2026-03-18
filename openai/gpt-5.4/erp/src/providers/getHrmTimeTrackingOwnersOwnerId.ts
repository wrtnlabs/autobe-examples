import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingOwnerTransformer } from "../transformers/HrmTimeTrackingOwnerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingOwnersOwnerId(props: {
  ownerId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingOwner> {
  const owner = await MyGlobal.prisma.hrm_time_tracking_owners.findFirstOrThrow(
    {
      where: {
        id: props.ownerId,
        deleted_at: null,
      },
      ...HrmTimeTrackingOwnerTransformer.select(),
    },
  );
  return await HrmTimeTrackingOwnerTransformer.transform(owner);
}
