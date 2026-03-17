import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import { IShoppingMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequestSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminRequestSnapshotTransformer } from "../transformers/ShoppingMallAdminRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdminRequestsRequestIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminRequestSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_admin_request_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          admin_request_id: props.requestId,
        },
        ...ShoppingMallAdminRequestSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallAdminRequestSnapshotTransformer.transform(snapshot);
}
