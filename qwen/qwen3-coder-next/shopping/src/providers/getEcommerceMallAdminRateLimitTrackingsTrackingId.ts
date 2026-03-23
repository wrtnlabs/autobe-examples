import { IEcommerceMallRateLimitTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRateLimitTracking";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallRateLimitTrackingTransformer } from "../transformers/EcommerceMallRateLimitTrackingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminRateLimitTrackingsTrackingId(props: {
  admin: AdminPayload;
  trackingId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallRateLimitTracking> {
  const tracking =
    await MyGlobal.prisma.ecommerce_mall_rate_limit_trackings.findUniqueOrThrow(
      {
        where: { id: props.trackingId },
        ...EcommerceMallRateLimitTrackingTransformer.select(),
      },
    );
  return await EcommerceMallRateLimitTrackingTransformer.transform(tracking);
}
