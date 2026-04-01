import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { IMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformAdministratorApprovalRequestSnapshotTransformer } from "../transformers/MallPlatformAdministratorApprovalRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformAdministratorAdministratorApprovalRequestsAdministratorApprovalRequestIdSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  administratorApprovalRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformAdministratorApprovalRequestSnapshot> {
  await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
    where: {
      id: props.administrator.id,
    },
    select: {
      id: true,
    },
  });
  const snapshot =
    await MyGlobal.prisma.mall_platform_administrator_approval_request_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          administrator_approval_request_id:
            props.administratorApprovalRequestId,
        },
        ...MallPlatformAdministratorApprovalRequestSnapshotTransformer.select(),
      },
    );
  return await MallPlatformAdministratorApprovalRequestSnapshotTransformer.transform(
    snapshot,
  );
}
