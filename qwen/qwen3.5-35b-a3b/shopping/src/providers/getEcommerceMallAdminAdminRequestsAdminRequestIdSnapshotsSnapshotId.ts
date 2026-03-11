import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminRequestSnapshotTransformer } from "../transformers/EcommerceMallAdminRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminAdminRequestsAdminRequestIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  adminRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminRequestSnapshot> {
  const adminRequestId = props.adminRequestId;
  const snapshotId = props.snapshotId;
  const adminId = props.admin.id;
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_admin_request_snapshots.findFirstOrThrow(
      {
        where: {
          id: snapshotId,
          ecommerce_mall_admin_request_request_id: adminRequestId,
        },
        ...EcommerceMallAdminRequestSnapshotTransformer.select(),
      },
    );
  const adminRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findFirst({
      where: { id: adminRequestId },
      select: {
        id: true,
        reason: true,
        request_status: true,
      },
    });
  if (!adminRequest) {
    throw new HttpException("Not Found", 404);
  }
  const snapshotAdmin =
    await MyGlobal.prisma.ecommerce_mall_admin_request_snapshots.findUnique({
      where: { id: snapshotId },
      select: { changed_by: true },
    });
  if (!snapshotAdmin) {
    throw new HttpException("Not Found", 404);
  }
  const adminUser = await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
    where: { id: adminId },
    select: { id: true, is_banned: true },
  });
  if (!adminUser) {
    throw new HttpException("Forbidden", 403);
  }
  if (adminUser.is_banned) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallAdminRequestSnapshotTransformer.transform(snapshot);
}
