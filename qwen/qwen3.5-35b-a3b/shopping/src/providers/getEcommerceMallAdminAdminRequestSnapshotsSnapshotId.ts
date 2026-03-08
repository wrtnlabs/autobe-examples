import { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
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

export async function getEcommerceMallAdminAdminRequestSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminRequestSnapshot> {
  // Query the snapshot with full relations for authorization verification
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_admin_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...EcommerceMallAdminRequestSnapshotTransformer.select(),
      },
    );
  // Verify the admin request still exists
  await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findUniqueOrThrow(
    {
      where: { id: snapshot.adminRequest.id },
    },
  );
  // Transform and return the snapshot
  return await EcommerceMallAdminRequestSnapshotTransformer.transform(snapshot);
}
