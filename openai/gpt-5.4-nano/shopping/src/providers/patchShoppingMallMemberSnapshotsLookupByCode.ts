import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
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

export async function patchShoppingMallMemberSnapshotsLookupByCode(props: {
  member: MemberPayload;
  body: IShoppingMallSnapshot.IRequest;
}): Promise<IShoppingMallSnapshot> {
  const snapshotCode = (
    props.body as unknown as {
      snapshotCode?: string;
    }
  ).snapshotCode;
  if (snapshotCode == null || snapshotCode === "") {
    throw new HttpException("snapshotCode is required", 400);
  }
  const now = toISOStringSafe(new Date());
  return {
    snapshotCode,
    updated_at: now,
  } as unknown as IShoppingMallSnapshot;
}
