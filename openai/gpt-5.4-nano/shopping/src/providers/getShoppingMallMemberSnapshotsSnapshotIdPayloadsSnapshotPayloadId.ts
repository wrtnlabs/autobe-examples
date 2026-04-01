import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getShoppingMallMemberSnapshotsSnapshotIdPayloadsSnapshotPayloadId(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
  snapshotPayloadId: string & tags.Format<"uuid">;
}): Promise<void> {
  const member = await MyGlobal.prisma.shopping_mall_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (member === null) {
    throw new HttpException("Forbidden", 403);
  }
  const visibility =
    await MyGlobal.prisma.shopping_mall_snapshot_parties.findFirst({
      where: {
        shopping_mall_snapshot_id: props.snapshotId,
        party_id: props.member.id,
        can_view: true,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (visibility === null) {
    throw new HttpException("Forbidden", 403);
  }
  const payload =
    await MyGlobal.prisma.shopping_mall_snapshot_payloads.findFirst({
      where: {
        id: props.snapshotPayloadId,
        shopping_mall_snapshot_id: props.snapshotId,
        deleted_at: null,
      },
      select: { payload: true },
    });
  if (payload === null) {
    throw new HttpException("Forbidden", 403);
  }
}
