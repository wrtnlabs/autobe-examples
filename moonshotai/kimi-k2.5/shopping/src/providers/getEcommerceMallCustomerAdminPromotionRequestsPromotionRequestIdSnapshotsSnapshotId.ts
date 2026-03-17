import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallAdminPromotionRequestSnapshotTransformer } from "../transformers/EcommerceMallAdminPromotionRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerAdminPromotionRequestsPromotionRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  promotionRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminPromotionRequestSnapshot> {
  // Query the snapshot by id and promotion request id
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_request_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          admin_promotion_request_id: props.promotionRequestId,
        },
        ...EcommerceMallAdminPromotionRequestSnapshotTransformer.select(),
      },
    );
  // Transform and return
  return await EcommerceMallAdminPromotionRequestSnapshotTransformer.transform(
    snapshot,
  );
}
