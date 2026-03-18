import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberSnapshotsSnapshotIdPayloads(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallSnapshotPayload.IUpdate;
}): Promise<IShoppingMallSnapshotPayload> {
  if (!props.member) {
    throw new HttpException("member is required", 400);
  }
  throw new HttpException("Not implemented", 501);
}
