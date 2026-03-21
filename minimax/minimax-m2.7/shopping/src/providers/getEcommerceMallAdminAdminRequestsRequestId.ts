import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminRequestTransformer } from "../transformers/EcommerceMallAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminAdminRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminRequest> {
  const request =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...EcommerceMallAdminRequestTransformer.select(),
    });
  if (request.deleted_at !== null) {
    throw new HttpException("Admin request not found", 404);
  }
  return await EcommerceMallAdminRequestTransformer.transform(request);
}
